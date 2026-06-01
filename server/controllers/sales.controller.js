const supabase = require('../config/supabase');

exports.getSalesLogs = async (req, res, next) => {
  const { userId, month } = req.query;

  if (!userId || !month) {
    return res.status(400).json({ message: 'User ID and Month are required query parameters.' });
  }

  try {
    const { data: logs, error } = await supabase
      .from('sales_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month);

    if (error) throw error;
    res.status(200).json(logs || []);
  } catch (err) {
    next(err);
  }
};

exports.saveSalesLogs = async (req, res, next) => {
  const { userId, month, logs } = req.body;

  if (!userId || !month || !Array.isArray(logs)) {
    return res.status(400).json({ message: 'User ID, Month, and logs array are required.' });
  }

  
  if (req.user.role === 'SALES_OFFICER' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Access denied. You cannot log sales for other officers.' });
  }

  try {
    
    const { error: deleteError } = await supabase
      .from('sales_logs')
      .delete()
      .eq('user_id', userId)
      .eq('month', month);
    if (deleteError) throw deleteError;

    
    const activeLogs = logs
      .filter(l => Number(l.volume) > 0)
      .map(l => ({
        user_id: userId,
        car_id: l.carId,
        volume: Number(l.volume),
        month: month,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

    if (activeLogs.length > 0) {
      const { error: insertError } = await supabase
        .from('sales_logs')
        .insert(activeLogs);
      if (insertError) throw insertError;
    }

    
    const { data: officer } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    const officerName = officer ? officer.name : userId;
    const totalVolume = activeLogs.reduce((sum, l) => sum + l.volume, 0);

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'LOG_SALES',
      details: `Saved ${activeLogs.length} showroom volume records for ${officerName} in period ${month} (Total units: ${totalVolume})`
    }]);

    res.status(200).json({ success: true, message: 'Sales logs successfully recorded!' });
  } catch (err) {
    next(err);
  }
};
