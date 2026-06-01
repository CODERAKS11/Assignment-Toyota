const supabase = require('../config/supabase');
const { resolveActiveSchemeId } = require('./slabs.controller');

exports.getDetailedAnalytics = async (req, res, next) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: 'Month query parameter is required.' });
  }

  try {
    
    const { data: cars, error: carsErr } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true });
    if (carsErr) throw carsErr;
    const activeCars = (cars || []).filter(c => c.active);

    // Resolve active scheme for month
    const activeSchemeId = await resolveActiveSchemeId(month);

    
    let slabs = [];
    let overrides = [];
    let targetBonusType = 'NONE';
    let targetBonusAmount = 0;
    if (activeSchemeId) {
      const { data: scheme } = await supabase
        .from('slab_schemes')
        .select('*')
        .eq('id', activeSchemeId)
        .single();
      
      if (scheme) {
        targetBonusType = scheme.target_bonus_type || 'NONE';
        targetBonusAmount = Number(scheme.target_bonus_amount) || 0;
      }

      const { data: slabsData, error: slabsErr } = await supabase
        .from('incentive_slabs')
        .select('*')
        .eq('scheme_id', activeSchemeId)
        .order('min_volume', { ascending: true });
      if (slabsErr) throw slabsErr;
      slabs = slabsData || [];

      const { data: overridesData, error: overridesErr } = await supabase
        .from('model_overrides')
        .select('*')
        .eq('scheme_id', activeSchemeId);
      if (overridesErr) throw overridesErr;
      overrides = overridesData || [];
    }

    
    const { data: officers, error: officersErr } = await supabase
      .from('users')
      .select('id, username, name, role')
      .eq('role', 'SALES_OFFICER');
    if (officersErr) throw officersErr;

    
    const { data: allLogs, error: logsErr } = await supabase
      .from('sales_logs')
      .select('*')
      .eq('month', month);
    if (logsErr) throw logsErr;

    const activeLogs = allLogs || [];

    // Fetch monthly targets
    const { data: targets, error: targetsErr } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('month', month);
    if (targetsErr) throw targetsErr;

    
    let currentMonthVolume = 0;
    let totalPayoutDisbursed = 0;

    const officerLeaderboard = (officers || []).map(officer => {
      const officerLogs = activeLogs.filter(l => l.user_id === officer.id);
      const totalVol = officerLogs.reduce((sum, l) => sum + Number(l.volume), 0);
      currentMonthVolume += totalVol;

      const eligibleLogs = officerLogs.filter(l => {
        const car = (cars || []).find(c => c.id === l.car_id);
        return car && car.eligible_for_incentive;
      });
      const eligibleVol = eligibleLogs.reduce((sum, l) => sum + Number(l.volume), 0);

      const activeSlab = (slabs || []).find(s => eligibleVol >= s.min_volume && (s.max_volume === null || eligibleVol <= s.max_volume)) || null;
      const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;
      
      // Resolve target for this officer
      const targetObj = (targets || []).find(t => t.user_id === officer.id);
      const targetVolume = targetObj ? targetObj.target_volume : 0;

      // Calculate dynamic payout incorporating FLAT or BONUS overrides
      let payout = 0;
      officerLogs.forEach(l => {
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

      // Target bonus achievement trigger
      let targetProgressPct = 0;
      let targetBonusUnlocked = false;
      if (targetVolume > 0) {
        targetProgressPct = Math.round((eligibleVol / targetVolume) * 100);
        if (eligibleVol >= targetVolume) {
          targetBonusUnlocked = true;
          if (targetBonusType === 'FLAT') {
            payout += targetBonusAmount;
          } else if (targetBonusType === 'PER_CAR') {
            payout += targetBonusAmount * eligibleVol;
          }
        }
      }
      
      totalPayoutDisbursed += payout;

      let activeTierLabel = 'No Tier Met';
      if (activeSlab) {
        activeTierLabel = activeSlab.label || `Tier ${(slabs || []).findIndex(s => s.id === activeSlab.id) + 1}`;
      }

      return {
        name: officer.name,
        username: officer.username,
        totalVolume: totalVol,
        totalPayout: payout,
        activeTierLabel,
        rate,
        targetVolume,
        percentageAchieved: targetProgressPct,
        bonusUnlocked: targetBonusUnlocked
      };
    }).sort((a, b) => b.totalVolume - a.totalVolume);

    
    const carBreakdown = activeCars.map(car => {
      const carLogs = activeLogs.filter(l => l.car_id === car.id);
      const vol = carLogs.reduce((sum, l) => sum + Number(l.volume), 0);
      return {
        modelName: car.model_name,
        variant: car.variant,
        volume: vol,
        percentage: 0
      };
    });

    const totalCarSales = carBreakdown.reduce((sum, c) => sum + c.volume, 0);
    carBreakdown.forEach(c => {
      c.percentage = totalCarSales > 0 ? Math.round((c.volume / totalCarSales) * 100) : 0;
    });
    carBreakdown.sort((a, b) => b.volume - a.volume);

    const averagePayout = officerLeaderboard.length > 0 ? Math.round(totalPayoutDisbursed / officerLeaderboard.length) : 0;
    
    const topOfficer = officerLeaderboard.length > 0 && officerLeaderboard[0].totalVolume > 0 ? officerLeaderboard[0] : null;
    const topOfficerName = topOfficer ? topOfficer.name : 'N/A';
    const topOfficerVolume = topOfficer ? topOfficer.totalVolume : 0;

    const topCar = carBreakdown.length > 0 && carBreakdown[0].volume > 0 ? carBreakdown[0] : null;
    const topCarModel = topCar ? `${topCar.modelName} (${topCar.variant})` : 'N/A';
    const topCarVolume = topCar ? topCar.volume : 0;

    res.status(200).json({
      totalActiveCars: activeCars.length,
      totalSlabTiers: (slabs || []).length,
      totalSalesOfficers: (officers || []).length,
      currentMonthVolume,
      totalPayoutDisbursed,
      averagePayout,
      topOfficerName,
      topOfficerVolume,
      topCarModel,
      topCarVolume,
      officerLeaderboard,
      carBreakdown
    });
  } catch (err) {
    next(err);
  }
};

exports.seedMockSalesData = async (req, res, next) => {
  const { month } = req.body;

  if (!month) {
    return res.status(400).json({ message: 'Month parameter is required inside payload body.' });
  }

  try {
    
    const { data: cars, error: carsErr } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true });
    if (carsErr) throw carsErr;
    const activeCars = (cars || []).filter(c => c.active);

    
    const { data: officers, error: officersErr } = await supabase
      .from('users')
      .select('id, username, name')
      .eq('role', 'SALES_OFFICER');
    if (officersErr) throw officersErr;

    if (activeCars.length === 0 || officers.length === 0) {
      return res.status(400).json({ message: 'Seeding failed. Active inventory models or sales officers are missing.' });
    }

    
    const mockLogs = [];
    officers.forEach((officer, oIdx) => {
      activeCars.forEach((car, cIdx) => {
        let volumeVal = 0;
        if (officer.username === 'officer1') {
          
          
          volumeVal = (cIdx < 4) ? 2 : 1;
        } else if (officer.username === 'officer2') {
          
          
          volumeVal = (cIdx < 6) ? 1 : 0;
        } else {
          volumeVal = Math.floor(Math.random() * 2);
        }
        mockLogs.push({
          user_id: officer.id,
          car_id: car.id,
          volume: volumeVal,
          month,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    });

    
    for (const officer of officers) {
      
      await supabase
        .from('sales_logs')
        .delete()
        .eq('user_id', officer.id)
        .eq('month', month);

      const officerLogs = mockLogs
        .filter(ml => ml.user_id === officer.id && ml.volume > 0);

      if (officerLogs.length > 0) {
        const { error: insErr } = await supabase
          .from('sales_logs')
          .insert(officerLogs);
        if (insErr) throw insErr;
      }
    }

    
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'SIMULATE_SALES',
      details: `Generated demo performance logs for period: ${month}`
    }]);

    res.status(200).json({ success: true, message: `Successfully seeded simulation logs for period ${month}!` });
  } catch (err) {
    next(err);
  }
};

exports.getReportsAndAudits = async (req, res, next) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear().toString();

  try {
    const { data: rawAudits, error: auditErr } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, details, created_at, users(name, username)')
      .order('created_at', { ascending: false });
    if (auditErr) throw auditErr;

    const auditLogs = (rawAudits || []).map(log => ({
      id: log.id,
      timestamp: log.created_at,
      action: log.action,
      details: log.details,
      adminUsername: log.users ? log.users.username : 'System'
    }));

    const { data: yearLogs, error: logsErr } = await supabase
      .from('sales_logs')
      .select('*')
      .like('month', `${targetYear}-%`);
    if (logsErr) throw logsErr;

    const { data: cars, error: carsErr } = await supabase
      .from('cars')
      .select('*');
    if (carsErr) throw carsErr;

    const { data: officers, error: officersErr } = await supabase
      .from('users')
      .select('id, name, username')
      .eq('role', 'SALES_OFFICER');
    if (officersErr) throw officersErr;

    const { data: allTargets, error: targetsErr } = await supabase
      .from('monthly_targets')
      .select('*')
      .like('month', `${targetYear}-%`);
    if (targetsErr) throw targetsErr;

    const { data: schemes } = await supabase
      .from('slab_schemes')
      .select('*');

    const months = Array.from({ length: 12 }, (_, i) => `${targetYear}-${String(i + 1).padStart(2, '0')}`);
    
    const ytdData = (officers || []).reduce((acc, off) => {
      acc[off.id] = {
        id: off.id,
        name: off.name,
        username: off.username,
        ytdVolume: 0,
        ytdPayout: 0
      };
      return acc;
    }, {});

    for (const m of months) {
      const monthLogs = (yearLogs || []).filter(l => l.month === m);
      if (monthLogs.length === 0) continue;

      const targetDate = `${m}-31`;
      const activeScheme = (schemes || [])
        .filter(s => s.activation_date <= targetDate)
        .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0];

      if (!activeScheme) continue;

      const { data: slabs } = await supabase
        .from('incentive_slabs')
        .select('*')
        .eq('scheme_id', activeScheme.id);
      
      const { data: overrides } = await supabase
        .from('model_overrides')
        .select('*')
        .eq('scheme_id', activeScheme.id);

      const targetBonusType = activeScheme.target_bonus_type || 'NONE';
      const targetBonusAmount = Number(activeScheme.target_bonus_amount) || 0;

      const monthTargets = (allTargets || []).filter(t => t.month === m);

      (officers || []).forEach(off => {
        const offLogs = monthLogs.filter(l => l.user_id === off.id);
        if (offLogs.length === 0) return;

        const totalVol = offLogs.reduce((sum, l) => sum + Number(l.volume), 0);
        
        const eligibleLogs = offLogs.filter(l => {
          const car = (cars || []).find(c => c.id === l.car_id);
          return car && car.eligible_for_incentive;
        });
        const eligibleVol = eligibleLogs.reduce((sum, l) => sum + Number(l.volume), 0);

        const activeSlab = (slabs || []).find(s => eligibleVol >= s.min_volume && (s.max_volume === null || eligibleVol <= s.max_volume)) || null;
        const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;

        let payout = 0;
        offLogs.forEach(l => {
          const car = (cars || []).find(c => c.id === l.car_id);
          if (!car || !car.eligible_for_incentive || Number(l.volume) === 0) return;

          const override = (overrides || []).find(o => o.car_id === car.id);
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

        const targetObj = monthTargets.find(t => t.user_id === off.id);
        const targetVol = targetObj ? targetObj.target_volume : 0;
        if (targetVol > 0 && eligibleVol >= targetVol) {
          if (targetBonusType === 'FLAT') {
            payout += targetBonusAmount;
          } else if (targetBonusType === 'PER_CAR') {
            payout += targetBonusAmount * eligibleVol;
          }
        }

        ytdData[off.id].ytdVolume += totalVol;
        ytdData[off.id].ytdPayout += payout;
      });
    }

    const ytdSummary = Object.values(ytdData);

    res.status(200).json({
      auditLogs,
      ytdSummary
    });
  } catch (err) {
    next(err);
  }
};
