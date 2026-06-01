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
