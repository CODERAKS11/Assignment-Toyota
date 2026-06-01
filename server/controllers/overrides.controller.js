const supabase = require('../config/supabase');

// Get all overrides for a specific slab scheme version
exports.getOverrides = async (req, res, next) => {
  const { schemeId } = req.params;

  try {
    const { data: overrides, error } = await supabase
      .from('model_overrides')
      .select('*')
      .eq('scheme_id', schemeId);

    if (error) throw error;
    res.status(200).json(overrides || []);
  } catch (err) {
    next(err);
  }
};

// Bulk save/replace overrides for a specific slab scheme version
exports.saveOverrides = async (req, res, next) => {
  const { schemeId } = req.params;
  const overridesArray = req.body; // Array of { car_id, override_type, amount }

  if (!Array.isArray(overridesArray)) {
    return res.status(400).json({ message: 'Payload must be an array of model overrides.' });
  }

  try {
    // 1. Delete existing overrides for this scheme
    const { error: deleteError } = await supabase
      .from('model_overrides')
      .delete()
      .eq('scheme_id', schemeId);

    if (deleteError) throw deleteError;

    if (overridesArray.length === 0) {
      return res.status(200).json({ success: true, message: 'All model overrides removed for this scheme.' });
    }

    // 2. Prepare new overrides
    const newOverrides = overridesArray.map(o => ({
      scheme_id: schemeId,
      car_id: o.car_id,
      override_type: o.override_type,
      amount: Number(o.amount),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // 3. Insert new overrides
    const { error: insertError } = await supabase
      .from('model_overrides')
      .insert(newOverrides);

    if (insertError) throw insertError;

    // 4. Log audit activity
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_MODEL_OVERRIDES',
      details: `Saved ${overridesArray.length} model overrides for scheme ID: ${schemeId}`
    }]);

    await supabase.from('announcements').insert([{
      title: 'Model Specific Incentives Updated',
      content: `The dealership administration has updated the model-specific overrides (flat rates and bonus boosts). Please check the active incentive schemes.`
    }]);

    // Update scheme updated_at to ensure audit compliance
    await supabase.from('slab_schemes').update({ updated_at: new Date().toISOString() }).eq('id', schemeId);

    res.status(200).json({ success: true, message: 'Model overrides successfully published!' });
  } catch (err) {
    next(err);
  }
};
