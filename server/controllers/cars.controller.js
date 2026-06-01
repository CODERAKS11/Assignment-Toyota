const supabase = require('../config/supabase');

exports.getCars = async (req, res, next) => {
  try {
    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.status(200).json(cars || []);
  } catch (err) {
    next(err);
  }
};

exports.addCar = async (req, res, next) => {
  const { model_name, base_suffix, variant, ex_showroom_price } = req.body;

  if (!model_name || !base_suffix || !variant) {
    return res.status(400).json({ message: 'Model name, suffix, and variant are required.' });
  }

  try {
    const newCar = {
      model_name,
      base_suffix,
      variant,
      ex_showroom_price: ex_showroom_price || '',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: car, error } = await supabase
      .from('cars')
      .insert([newCar])
      .select()
      .single();

    if (error) throw error;

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'ADD_CAR',
      details: `Registered new showroom model: ${model_name} ${base_suffix} (${variant})`
    }]);

    
    await supabase.from('announcements').insert([{
      title: 'New Showroom Model Available',
      content: `A new showroom vehicle model has been added: Toyota ${model_name} ${base_suffix} (${variant}) is now active in your showroom inventory tracker!`
    }]);

    res.status(201).json(car);
  } catch (err) {
    next(err);
  }
};

exports.updateCar = async (req, res, next) => {
  const { id } = req.params;
  const { model_name, base_suffix, variant, active, ex_showroom_price } = req.body;

  try {
    const { data: car, error } = await supabase
      .from('cars')
      .update({
        model_name,
        base_suffix,
        variant,
        active,
        ex_showroom_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_CAR',
      details: `Updated specifications for model: ${model_name} ${base_suffix} (Active: ${active})`
    }]);

    res.status(200).json(car);
  } catch (err) {
    next(err);
  }
};

exports.deleteCar = async (req, res, next) => {
  const { id } = req.params;

  try {
    
    const { data: carToDel } = await supabase
      .from('cars')
      .select('model_name, base_suffix')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const label = carToDel ? `${carToDel.model_name} ${carToDel.base_suffix}` : id;

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'DELETE_CAR',
      details: `Removed vehicle registry from registry: ${label}`
    }]);

    res.status(200).json({ success: true, message: 'Vehicle deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
