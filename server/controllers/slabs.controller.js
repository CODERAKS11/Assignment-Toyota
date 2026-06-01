const supabase = require('../config/supabase');

// Helper to resolve the active scheme ID for a given period
const resolveActiveSchemeId = async (month) => {
  let targetDate;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    targetDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else {
    const d = new Date();
    targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const { data: schemes, error } = await supabase
    .from('slab_schemes')
    .select('id')
    .lte('activation_date', targetDate)
    .order('activation_date', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (schemes && schemes.length > 0) {
    return schemes[0].id;
  }
  
  const { data: fallbackSchemes, error: fallbackErr } = await supabase
    .from('slab_schemes')
    .select('id')
    .order('activation_date', { ascending: true })
    .limit(1);
    
  if (fallbackErr) throw fallbackErr;
  return fallbackSchemes && fallbackSchemes.length > 0 ? fallbackSchemes[0].id : null;
};

exports.resolveActiveSchemeId = resolveActiveSchemeId;

// Get slabs (scoped by schemeId, or fallback to resolved active scheme for period/month)
exports.getSlabs = async (req, res, next) => {
  const { schemeId, month } = req.query;

  try {
    let targetSchemeId = schemeId;

    if (!targetSchemeId) {
      targetSchemeId = await resolveActiveSchemeId(month);
    }

    if (!targetSchemeId) {
      return res.status(200).json([]); // No scheme available yet
    }

    const { data: slabs, error } = await supabase
      .from('incentive_slabs')
      .select('*')
      .eq('scheme_id', targetSchemeId)
      .order('min_volume', { ascending: true });

    if (error) throw error;
    res.status(200).json(slabs || []);
  } catch (err) {
    next(err);
  }
};

// Save slabs for a specific scheme
exports.saveSlabs = async (req, res, next) => {
  const { schemeId, slabs: slabsArray } = req.body;

  if (!schemeId || !Array.isArray(slabsArray)) {
    return res.status(400).json({ message: 'Scheme ID and slabs array are required.' });
  }

  try {
    // 1. Fetch previous slabs for detailed comparison audit trail
    const { data: existingSlabs } = await supabase
      .from('incentive_slabs')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('min_volume', { ascending: true });

    let changeDetails = [];
    const maxLength = Math.max(existingSlabs ? existingSlabs.length : 0, slabsArray.length);
    for (let i = 0; i < maxLength; i++) {
      const oldSlab = existingSlabs && existingSlabs[i];
      const newSlab = slabsArray[i];
      
      if (oldSlab && newSlab) {
        if (oldSlab.min_volume !== Number(newSlab.min_volume) || 
            oldSlab.max_volume !== (newSlab.max_volume === null ? null : Number(newSlab.max_volume)) || 
            Number(oldSlab.payout_per_car) !== Number(newSlab.payout_per_car) || 
            oldSlab.label !== newSlab.label) {
          changeDetails.push(`Tier ${i + 1} "${oldSlab.label || ''}" changed: Vol [${oldSlab.min_volume}-${oldSlab.max_volume || '∞'}] Payout ₹${oldSlab.payout_per_car}/car -> Vol [${newSlab.min_volume}-${newSlab.max_volume || '∞'}] Payout ₹${newSlab.payout_per_car}/car`);
        }
      } else if (oldSlab && !newSlab) {
        changeDetails.push(`Tier ${i + 1} "${oldSlab.label || ''}" removed (Vol [${oldSlab.min_volume}-${oldSlab.max_volume || '∞'}] Payout ₹${oldSlab.payout_per_car}/car)`);
      } else if (!oldSlab && newSlab) {
        changeDetails.push(`Tier ${i + 1} "${newSlab.label || ''}" added (Vol [${newSlab.min_volume}-${newSlab.max_volume || '∞'}] Payout ₹${newSlab.payout_per_car}/car)`);
      }
    }

    const auditDetails = changeDetails.length > 0 
      ? `Slabs updated under Scheme ID ${schemeId}. Changes:\n- ` + changeDetails.join('\n- ')
      : `Slabs published under Scheme ID ${schemeId} (No changes in values).`;

    // 2. Delete existing slabs for this specific scheme version
    const { error: deleteError } = await supabase
      .from('incentive_slabs')
      .delete()
      .eq('scheme_id', schemeId);

    if (deleteError) throw deleteError;

    if (slabsArray.length === 0) {
      return res.status(200).json({ success: true, message: 'All slabs removed for this scheme.' });
    }

    // 3. Prepare new slabs
    const newSlabs = slabsArray.map((s, idx) => ({
      scheme_id: schemeId,
      min_volume: Number(s.min_volume),
      max_volume: s.max_volume === null ? null : Number(s.max_volume),
      payout_per_car: Number(s.payout_per_car),
      label: s.label || `Tier ${idx + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('incentive_slabs')
      .insert(newSlabs);
    if (insertError) throw insertError;

    // 4. Log audit activity
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_SLABS',
      details: auditDetails
    }]);

    // Update scheme updated_at to ensure audit compliance
    await supabase.from('slab_schemes').update({ updated_at: new Date().toISOString() }).eq('id', schemeId);

    // 5. Log Corporate Announcement
    await supabase.from('announcements').insert([{
      title: 'Scheme Incentive Slabs Restructured',
      content: `A configuration adjustment has been published for scheme version incentive slabs, now featuring ${slabsArray.length} commission tiers. Check your dashboard to view the updated payout milestones!`
    }]);

    res.status(200).json({ success: true, message: 'Incentive slabs successfully published!' });
  } catch (err) {
    next(err);
  }
};
