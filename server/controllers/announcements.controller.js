const supabase = require('../config/supabase');

exports.getAnnouncements = async (req, res, next) => {
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(announcements || []);
  } catch (err) {
    next(err);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    
    // Auto-generate UUID since it's defined in SQLite schema
    const id = require('crypto').randomUUID();

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([{ id, title, content }]);

    if (error) throw error;
    res.status(201).json(announcement || { success: true });
  } catch (err) {
    next(err);
  }
};
