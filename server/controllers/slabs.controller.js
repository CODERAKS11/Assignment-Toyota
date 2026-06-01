const supabase = require('../config/supabase');

exports.getSlabs = async (req, res, next) => {
  try {
    const { data: slabs, error } = await supabase
      .from('incentive_slabs')
      .select('*')
      .order('min_volume', { ascending: true });

    if (error) throw error;
    res.status(200).json(slabs || []);
  } catch (err) {
    next(err);
  }
};

exports.saveSlabs = async (req, res, next) => {
  const slabsArray = req.body;

  if (!Array.isArray(slabsArray)) {
    return res.status(400).json({ message: 'Payload must be an array of slabs.' });
  }

  try {
    
    const { error: deleteError } = await supabase
      .from('incentive_slabs')
      .delete()
      .gte('min_volume', 0);
    if (deleteError) throw deleteError;

    if (slabsArray.length === 0) {
      return res.status(200).json({ success: true, message: 'All slabs removed.' });
    }

    
    const newSlabs = slabsArray.map((s, idx) => ({
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

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_SLABS',
      details: `Published dynamic slabs restructuring: ${slabsArray.length} tiers active`
    }]);

    
    await supabase.from('announcements').insert([{
      title: 'Incentive Slabs Updated',
      content: `Head office has adjusted the active dynamic incentive slabs configuration to ${slabsArray.length} active tiers. Check your dashboard to view the updated commission payouts!`
    }]);

    res.status(200).json({ success: true, message: 'Incentive slabs successfully published!' });
  } catch (err) {
    next(err);
  }
};
