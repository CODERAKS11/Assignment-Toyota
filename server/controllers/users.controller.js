const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { resolveActiveSchemeId } = require('./slabs.controller');

// Fetch all Sales Officers with their profile data and optional monthly snaps
exports.getOfficers = async (req, res, next) => {
  const { month } = req.query; // optional 'YYYY-MM' snapshot period

  try {
    // 1. Fetch all officers
    const { data: officers, error: officersErr } = await supabase
      .from('users')
      .select('id, username, name, role, email, active, employee_id, branch_code, reporting_manager, date_of_joining, designation, contact_number, deactivation_reason, created_at, updated_at')
      .eq('role', 'SALES_OFFICER')
      .order('name', { ascending: true });

    if (officersErr) throw officersErr;

    if (!month || officers.length === 0) {
      return res.status(200).json(officers || []);
    }

    // 2. Fetch monthly stats to attach snapshots for finance auditing
    const { data: cars } = await supabase.from('cars').select('*');
    const { data: salesLogs } = await supabase.from('sales_logs').select('*').eq('month', month);
    const { data: targets } = await supabase.from('monthly_targets').select('*').eq('month', month);

    const activeSchemeId = await resolveActiveSchemeId(month);
    let slabs = [];
    let overrides = [];
    let targetBonusType = 'NONE';
    let targetBonusAmount = 0;

    if (activeSchemeId) {
      const { data: scheme } = await supabase.from('slab_schemes').select('*').eq('id', activeSchemeId).single();
      if (scheme) {
        targetBonusType = scheme.target_bonus_type || 'NONE';
        targetBonusAmount = Number(scheme.target_bonus_amount) || 0;
      }

      const { data: slabsData } = await supabase
        .from('incentive_slabs')
        .select('*')
        .eq('scheme_id', activeSchemeId)
        .order('min_volume', { ascending: true });
      slabs = slabsData || [];

      const { data: overridesData } = await supabase
        .from('model_overrides')
        .select('*')
        .eq('scheme_id', activeSchemeId);
      overrides = overridesData || [];
    }

    // 3. Map logs into snapshots per officer
    const officersWithSnaps = officers.map(officer => {
      const logs = (salesLogs || []).filter(l => l.user_id === officer.id);
      const totalVol = logs.reduce((sum, l) => sum + Number(l.volume), 0);

      const eligibleLogs = logs.filter(l => {
        const car = (cars || []).find(c => c.id === l.car_id);
        return car && car.eligible_for_incentive;
      });
      const eligibleVol = eligibleLogs.reduce((sum, l) => sum + Number(l.volume), 0);

      const activeSlab = slabs.find(s => eligibleVol >= s.min_volume && (s.max_volume === null || eligibleVol <= s.max_volume)) || null;
      const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;

      // Calculate dynamic payout
      let payout = 0;
      logs.forEach(l => {
        const car = (cars || []).find(c => c.id === l.car_id);
        if (!car || !car.eligible_for_incentive || Number(l.volume) === 0) return;

        const override = overrides.find(o => o.car_id === car.id);
        if (override) {
          if (override.override_type === 'FLAT') {
            payout += Number(l.volume) * Number(override.amount);
          } else if (override.override_type === 'BONUS') {
            payout += Number(l.volume) * (rate + Number(override.amount));
          }
        } else {
          payout += Number(l.volume) * rate;
        }
      });

      // Target calculations
      const targetObj = (targets || []).find(t => t.user_id === officer.id);
      const targetVolume = targetObj ? targetObj.target_volume : 0;
      let targetProgressPct = 0;
      let targetBonusUnlocked = false;

      if (targetVolume > 0) {
        targetProgressPct = Math.round((eligibleVol / targetVolume) * 100);
        if (eligibleVol >= targetVolume) {
          targetBonusUnlocked = true;
          // Apply target achievement bonus
          if (targetBonusType === 'FLAT') {
            payout += targetBonusAmount;
          } else if (targetBonusType === 'PER_CAR') {
            payout += targetBonusAmount * eligibleVol;
          }
        }
      }

      return {
        ...officer,
        snapshot: {
          carsSold: totalVol,
          incentiveEarned: payout,
          targetVolume,
          targetProgressPct,
          targetBonusUnlocked
        }
      };
    });

    res.status(200).json(officersWithSnaps);
  } catch (err) {
    next(err);
  }
};

// Create a new sales officer (admin registering an employee)
exports.createOfficer = async (req, res, next) => {
  const {
    username,
    password,
    name,
    email,
    employee_id,
    branch_code,
    reporting_manager,
    date_of_joining,
    designation,
    contact_number
  } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Username, password, and officer name are required.' });
  }

  // Employee ID format validation: e.g. TKM-2024-001
  if (employee_id && !/^TKM-\d{4}-\d{3}$/.test(employee_id)) {
    return res.status(400).json({ message: 'Invalid Employee ID format. Must match TKM-YYYY-XXX format.' });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const newOfficer = {
      username,
      password_hash,
      name,
      email: email || '',
      role: 'SALES_OFFICER',
      active: true,
      employee_id,
      branch_code: branch_code || 'BR-01',
      reporting_manager: reporting_manager || '',
      date_of_joining: date_of_joining || new Date().toISOString().substring(0, 10),
      designation: designation || 'Sales Executive',
      contact_number: contact_number || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert([newOfficer])
      .select('id, username, name, role, email, active, employee_id, designation')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'CREATE_OFFICER',
      details: `Registered sales officer profile: ${name} (Employee ID: ${employee_id})`
    }]);

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

// Update officer profile details
exports.updateOfficer = async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    email,
    employee_id,
    branch_code,
    reporting_manager,
    date_of_joining,
    designation,
    contact_number
  } = req.body;

  if (employee_id && !/^TKM-\d{4}-\d{3}$/.test(employee_id)) {
    return res.status(400).json({ message: 'Invalid Employee ID format. Must match TKM-YYYY-XXX format.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({
        name,
        email,
        employee_id,
        branch_code,
        reporting_manager,
        date_of_joining,
        designation,
        contact_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, username, name, role, email, active, employee_id, designation')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'UPDATE_OFFICER_PROFILE',
      details: `Updated sales officer profile: ${name} (ID: ${id})`
    }]);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// Toggle Active/Inactive status with optional reason
exports.toggleOfficerStatus = async (req, res, next) => {
  const { id } = req.params;
  const { active, deactivation_reason } = req.body;

  try {
    const { data: officerToUpdate } = await supabase
      .from('users')
      .select('name')
      .eq('id', id)
      .single();

    const { data: user, error } = await supabase
      .from('users')
      .update({
        active: !!active,
        deactivation_reason: active ? null : (deactivation_reason || 'Administrative Deactivation'),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, username, name, active, deactivation_reason')
      .single();

    if (error) throw error;

    const officerName = officerToUpdate ? officerToUpdate.name : id;
    const statusText = active ? 'ACTIVATED' : `DEACTIVATED (Reason: ${deactivation_reason})`;

    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      details: `Toggled user status for ${officerName}: Now ${statusText}`
    }]);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
