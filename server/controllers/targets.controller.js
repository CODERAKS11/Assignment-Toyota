const supabase = require('../config/supabase');

// Fetch targets for a billing month
exports.getTargets = async (req, res, next) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: 'Month query parameter is required.' });
  }

  try {
    const { data: targets, error } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', month);

    if (error) throw error;
    res.status(200).json(targets || []);
  } catch (err) {
    next(err);
  }
};

// Create or update a single monthly target for an officer
exports.saveTarget = async (req, res, next) => {
  const { userId, month, targetVolume } = req.body;

  if (!userId || !month || targetVolume === undefined) {
    return res.status(400).json({ message: 'User ID, Month, and Target Volume are required.' });
  }

  try {
    // 1. Delete existing target if exists to avoid conflicts
    await supabase
      .from('monthly_targets')
      .delete()
      .eq('user_id', userId)
      .eq('month', month);

    // 2. Insert new target
    const newTarget = {
      user_id: userId,
      month,
      target_volume: Number(targetVolume),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: target, error: insertError } = await supabase
      .from('monthly_targets')
      .insert([newTarget])
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Fetch officer name for audit details
    const { data: officer } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();
    const officerLabel = officer ? officer.name : userId;

    // 4. Log audit log
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'ASSIGN_MONTHLY_TARGET',
      details: `Assigned sales target volume of ${targetVolume} units to ${officerLabel} for period ${month}`
    }]);

    res.status(200).json(target);
  } catch (err) {
    next(err);
  }
};
