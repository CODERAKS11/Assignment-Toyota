const supabase = require('../config/supabase');

// Get all slab schemes ordered by activation date descending
exports.getSchemes = async (req, res, next) => {
  try {
    const { data: schemes, error } = await supabase
      .from('slab_schemes')
      .select('*')
      .order('activation_date', { ascending: false });

    if (error) throw error;
    res.status(200).json(schemes || []);
  } catch (err) {
    next(err);
  }
};

// Create a new scheme version
exports.createScheme = async (req, res, next) => {
  const { name, activation_date, cloneFromId, target_bonus_type, target_bonus_amount } = req.body;

  if (!name || !activation_date) {
    return res.status(400).json({ message: 'Scheme name and activation date are required.' });
  }

  try {
    // 1. Create the new scheme
    const newScheme = {
      name,
      activation_date,
      target_bonus_type: target_bonus_type || 'NONE',
      target_bonus_amount: target_bonus_amount !== undefined ? Number(target_bonus_amount) : 0.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If cloning, query template details first
    if (cloneFromId) {
      const { data: templateScheme } = await supabase
        .from('slab_schemes')
        .select('*')
        .eq('id', cloneFromId)
        .single();
      
      if (templateScheme) {
        newScheme.target_bonus_type = templateScheme.target_bonus_type;
        newScheme.target_bonus_amount = templateScheme.target_bonus_amount;
      }
    }

    const { data: scheme, error: schemeErr } = await supabase
      .from('slab_schemes')
      .insert([newScheme])
      .select()
      .single();

    if (schemeErr) throw schemeErr;

    // 2. Clone slabs and overrides from template if requested
    if (cloneFromId) {
      // Fetch slabs to clone
      const { data: slabsToClone, error: slabsErr } = await supabase
        .from('incentive_slabs')
        .select('*')
        .eq('scheme_id', cloneFromId);

      if (slabsErr) throw slabsErr;

      if (slabsToClone && slabsToClone.length > 0) {
        const clonedSlabs = slabsToClone.map((s, idx) => ({
          scheme_id: scheme.id,
          min_volume: s.min_volume,
          max_volume: s.max_volume,
          payout_per_car: s.payout_per_car,
          label: s.label || `Tier ${idx + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insertSlabsErr } = await supabase
          .from('incentive_slabs')
          .insert(clonedSlabs);

        if (insertSlabsErr) throw insertSlabsErr;
      }

      // Fetch overrides to clone
      const { data: overridesToClone, error: overridesErr } = await supabase
        .from('model_overrides')
        .select('*')
        .eq('scheme_id', cloneFromId);

      if (overridesErr) throw overridesErr;

      if (overridesToClone && overridesToClone.length > 0) {
        const clonedOverrides = overridesToClone.map(o => ({
          scheme_id: scheme.id,
          car_id: o.car_id,
          override_type: o.override_type,
          amount: o.amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insertOverridesErr } = await supabase
          .from('model_overrides')
          .insert(clonedOverrides);

        if (insertOverridesErr) throw insertOverridesErr;
      }
    }

    // 3. Log audit activity
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'CREATE_SCHEME',
      details: `Created new slab scheme version: ${name} (Activation Date: ${activation_date}, Cloned: ${!!cloneFromId})`
    }]);

    res.status(201).json(scheme);
  } catch (err) {
    next(err);
  }
};

// Update scheme metadata (editable only if upcoming/non-historical)
exports.updateScheme = async (req, res, next) => {
  const { id } = req.params;
  const { name, activation_date, target_bonus_type, target_bonus_amount } = req.body;

  try {
    const { data: scheme, error: updateErr } = await supabase
      .from('slab_schemes')
      .update({
        name,
        activation_date,
        target_bonus_type,
        target_bonus_amount: target_bonus_amount !== undefined ? Number(target_bonus_amount) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_SCHEME',
      details: `Updated slab scheme version metadata: ${name} (ID: ${id})`
    }]);

    await supabase.from('announcements').insert([{
      title: 'Incentive Scheme Configuration Updated',
      content: `The payout scheme "${name}" has been updated by the administration. Please review the updated incentive policies.`
    }]);

    res.status(200).json(scheme);
  } catch (err) {
    next(err);
  }
};

// Delete scheme (along with cascaded slabs and overrides)
exports.deleteScheme = async (req, res, next) => {
  const { id } = req.params;

  try {
    const { data: schemeToDel } = await supabase
      .from('slab_schemes')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('slab_schemes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const label = schemeToDel ? schemeToDel.name : id;

    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'DELETE_SCHEME',
      details: `Deleted slab scheme version: ${label} (ID: ${id})`
    }]);

    res.status(200).json({ success: true, message: 'Slab scheme deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
