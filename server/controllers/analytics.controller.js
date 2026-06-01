const supabase = require('../config/supabase');

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

    
    const { data: slabs, error: slabsErr } = await supabase
      .from('incentive_slabs')
      .select('*')
      .order('min_volume', { ascending: true });
    if (slabsErr) throw slabsErr;

    
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

    
    let currentMonthVolume = 0;
    let totalPayoutDisbursed = 0;

    const officerLeaderboard = (officers || []).map(officer => {
      const officerLogs = activeLogs.filter(l => l.user_id === officer.id);
      const totalVol = officerLogs.reduce((sum, l) => sum + Number(l.volume), 0);
      currentMonthVolume += totalVol;

      
      const activeSlab = (slabs || []).find(s => totalVol >= s.min_volume && (s.max_volume === null || totalVol <= s.max_volume)) || null;
      const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;
      const payout = totalVol * rate;
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
        activeTierLabel
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
