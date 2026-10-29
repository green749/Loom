/**
 * LOOMPILOT - Intelligent Textile Manufacturing & Multi-Agent Platform
 * Autonomous Multi-Agent OS for Textile Industry Quotation & Delay Avoidance
 * 
 * Agents:
 * 1. Quotation Agent: Prepares BOM, machine costing & quotations; requires Admin approval.
 * 2. Risk Analysis Agent: Monitors daily raw material commodity rates & volatility.
 *    - Only alerts Admin when raw material price increases (price decreases are retained by mill).
 * 3. Production Agent: Runs daily from production start to delivery date; compares today's work vs target run-rate; calculates delays.
 * 4. Bargaining Agent: Triggered at quote approval or price hike; negotiates terms & advances with client.
 * 5. Payment Follow-up Agent: Runs after delivery & milestones; alerts client and admin.
 */

// =============================================================================
// 1. GLOBAL STATE & LOCAL STORAGE PERSISTENCE
// =============================================================================

const STORAGE_KEY = 'loompilot_state_v1';

// Initial Mock Data
const INITIAL_STATE = {
  simDay: 1,
  simDate: '2026-10-29',
  currentRole: 'admin', // 'admin' | 'supervisor' | 'client'
  currentTab: 'orders',
  selectedOrderId: 'LP-7801',
  
  // Commodity Market Prices (USD)
  commodities: {
    cotton: { name: 'Raw Cotton (Shankar-6)', price: 2.85, baseline: 2.85, unit: 'kg', trend: '+0.0%' },
    polyester: { name: 'Polyester Staple (PSF)', price: 1.65, baseline: 1.65, unit: 'kg', trend: '+0.0%' },
    reactiveDye: { name: 'Reactive Dyes & Pigments', price: 4.20, baseline: 4.20, unit: 'kg', trend: '+0.0%' },
    powerUnit: { name: 'Grid Electricity', price: 0.14, baseline: 0.14, unit: 'kWh', trend: '+0.0%' }
  },

  // Users Profiles
  users: {
    admin: {
      id: 'admin_1',
      name: 'Rajesh Singhania',
      role: 'admin',
      roleTitle: 'General Manager & Director',
      unit: 'Central Spinning & Weaving Mill',
      avatar: 'assets/avatar.svg'
    },
    supervisor: {
      id: 'sup_1',
      name: 'Murugan K.',
      role: 'supervisor',
      roleTitle: 'Weaving Master & Shift Supervisor',
      unit: 'Weaving Shed A (Airjet Looms 1-24)',
      avatar: 'assets/avatar.svg',
      assignedOrders: ['LP-7801', 'LP-7804']
    },
    client: {
      id: 'client_1',
      name: 'Priya Sharma',
      role: 'client',
      roleTitle: 'Head of Fabric Sourcing',
      company: 'Raymond Apparel Ltd.',
      email: 'priya.sharma@raymond.com',
      avatar: 'assets/avatar.svg',
      myOrders: ['LP-7801', 'LP-7804']
    }
  },

  // Manufacturing Orders & Quotations
  orders: [
    {
      id: 'LP-7801',
      clientName: 'Raymond Apparel Ltd.',
      clientId: 'client_1',
      supervisorId: 'sup_1',
      fabricName: '40s Combed Cotton 2/1 Twill',
      specs: { yarnCount: '40s Combed Ring Spun', gsm: 210, width: '58 inches', finish: 'Mercerized Bio-wash', weave: '2/1 Twill' },
      totalMeters: 15000,
      producedMeters: 9450,
      startDate: '2026-10-15',
      deadline: '2026-11-05',
      priority: 'Standard Contract',
      destination: 'Bengaluru, KA',
      stage: 'Loom Weaving', // Stages: 1. Quote Accepted, 2. Yarn Sourcing, 3. Warping & Sizing, 4. Loom Weaving, 5. Dyeing & Finishing, 6. Quality Check, 7. Packaging & Dispatch, 8. Delivered
      status: 'In Production',
      delayDays: 0,
      estDeliveryDate: '2026-11-05',
      originalQuote: {
        pricePerMeter: 3.20,
        total: 48000,
        adminApproved: true,
        bom: { rawCotton: 24000, spinning: 7500, dyeingChemicals: 4500, loomEnergy: 4800, laborMargin: 7200 }
      },
      currentQuote: { pricePerMeter: 3.20, total: 48000 },
      revisedQuote: null,
      advancePaid: 14400, // 30%
      paymentStatus: 'Advance Paid (30%)',
      dailyLogs: [
        { day: 'Day 1 (29 Oct)', loomsRunning: 18, weaversPresent: 24, producedToday: 680, scrapMeters: 8, stage: 'Loom Weaving', notes: 'Airjet Looms #1-8 operating at 850 RPM without yarn breakage.', targetRunRate: 793, delayEst: 0 }
      ]
    },
    {
      id: 'LP-7802',
      clientName: 'Arvind Denim Brands',
      clientId: 'client_2',
      supervisorId: 'sup_1',
      fabricName: '12.5oz Indigo Warp Raw Denim',
      specs: { yarnCount: '10s Ring Spun x 9s Open End', gsm: 420, width: '60 inches', finish: 'Sanforized Anti-Shrink', weave: '3/1 Right Hand Twill' },
      totalMeters: 8000,
      producedMeters: 5800,
      startDate: '2026-10-10',
      deadline: '2026-11-10',
      priority: 'Export Priority',
      destination: 'Ahmedabad, GJ',
      stage: 'Dyeing & Finishing',
      status: 'Price Revision Alert',
      delayDays: 2,
      estDeliveryDate: '2026-11-12',
      originalQuote: {
        pricePerMeter: 4.50,
        total: 36000,
        adminApproved: true,
        bom: { rawCotton: 19500, indigoDye: 5400, weaving: 4500, riskMargin: 6600 }
      },
      currentQuote: { pricePerMeter: 4.50, total: 36000 },
      revisedQuote: {
        revisedPricePerMeter: 4.85,
        revisedTotal: 38800,
        originalTotal: 36000,
        diff: 2800,
        reason: 'Raw Cotton Index surged +14.2% & Indigo Eco-Dye +8%',
        adminApprovedForClient: true,
        soFarProducedMeters: 5800,
        remainingMeters: 2200
      },
      advancePaid: 10800,
      paymentStatus: 'Advance Paid (30%)',
      dailyLogs: [
        { day: 'Day 1 (29 Oct)', loomsRunning: 16, weaversPresent: 20, producedToday: 420, scrapMeters: 14, stage: 'Dyeing & Finishing', notes: 'Dye continuous range calibration delayed line by 3 hours.', targetRunRate: 550, delayEst: 2 }
      ]
    },
    {
      id: 'LP-7803',
      clientName: 'Nordic Linen & Home',
      clientId: 'client_3',
      supervisorId: 'sup_2',
      fabricName: 'Pure Flax Linen Melange',
      specs: { yarnCount: '25 Lea Linen', gsm: 185, width: '54 inches', finish: 'Stone Enzyme Wash', weave: 'Plain Weave' },
      totalMeters: 5000,
      producedMeters: 5000,
      startDate: '2026-09-28',
      deadline: '2026-10-28',
      priority: 'Sea Freight Export',
      destination: 'Rotterdam, NL',
      stage: 'Delivered',
      status: 'Delivered',
      delayDays: 0,
      estDeliveryDate: '2026-10-28',
      originalQuote: {
        pricePerMeter: 6.80,
        total: 34000,
        adminApproved: true,
        bom: { rawLinen: 18000, sizingWeaving: 6800, enzymeWash: 4200, margin: 5000 }
      },
      currentQuote: { pricePerMeter: 6.80, total: 34000 },
      revisedQuote: null,
      advancePaid: 10200,
      paymentStatus: 'Payment Follow-up Alert (Balance $23,800 Due)',
      dailyLogs: []
    },
    {
      id: 'LP-7804',
      clientName: 'Raymond Apparel Ltd.',
      clientId: 'client_1',
      supervisorId: 'sup_1',
      fabricName: 'Poly-Viscose Blended Suiting',
      specs: { yarnCount: '2/40s Poly-Viscose Blend', gsm: 240, width: '58 inches', finish: 'Teflon Soil Release', weave: 'Micro Dobby Weave' },
      totalMeters: 12000,
      producedMeters: 0,
      startDate: '2026-11-01',
      deadline: '2026-11-28',
      priority: 'Domestic Fast-Track',
      destination: 'Mumbai, MH',
      stage: 'Quotation Preparation',
      status: 'Admin Review',
      delayDays: 0,
      estDeliveryDate: '2026-11-28',
      originalQuote: {
        pricePerMeter: 3.65,
        total: 43800,
        adminApproved: false, // WAITING FOR ADMIN APPROVAL
        bom: { rawPolymer: 15500, viscoseSpinning: 11000, weavingDobby: 6700, riskBuffer: 2600, millMargin: 8000 }
      },
      currentQuote: { pricePerMeter: 3.65, total: 43800 },
      revisedQuote: null,
      advancePaid: 0,
      paymentStatus: 'Quotation Pending Approval',
      dailyLogs: []
    }
  ],

  // AI Agent Audit Activity Stream
  agentActivities: [
    { time: '09:15 AM', agent: 'Quotation Agent + Risk Agent', message: 'Generated BOM and quotation for LP-7804 (12,000m Poly-Viscose). Held for Admin Approval.' },
    { time: '08:45 AM', agent: 'Risk Analysis Agent', message: 'Shankar-6 Cotton indexed at $2.85/kg (+3.2%). Market volatility moderate at 4.1%.' },
    { time: '08:00 AM', agent: 'Production Agent', message: 'LP-7801 daily pace verified: 680m/day vs target 793m/day. On track within safe buffer.' },
    { time: 'Yesterday', agent: 'Payment Follow-up', message: 'LP-7803 flagged Delivered. Follow-up dispatched to Nordic Linen & Home for $23,800 balance.' }
  ],

  // Bargaining Chat Transcripts for Orders
  chatTranscripts: {
    'LP-7802': [
      { sender: 'agent', name: 'AI Bargaining Agent', time: '09:20 AM', text: 'Hello Priya Sharma! Due to an unexpected surge in global Shankar-6 raw cotton (+14.2%) and indigo dye chemicals, our BOM increased. However, the textile mill has absorbed costs for the 5,800m already produced! The revised rate of $4.85/m applies ONLY to the remaining 2,200m.' },
      { sender: 'user', name: 'Priya Sharma (Buyer)', time: '09:25 AM', text: 'Can you provide a volume rebate or discount if we increase our advance payment to 50%?' },
      { sender: 'agent', name: 'AI Bargaining Agent', time: '09:26 AM', text: 'Thank you for the proposal. If Raymond Garments increases the advance deposit from 30% to 50%, we can lock in an immediate $0.15/m concession, bringing the rate down to $4.70/m. Would you like me to update the contract?' }
    ],
    'LP-7801': [
      { sender: 'agent', name: 'AI Bargaining Agent', time: '09:00 AM', text: 'Welcome to LoomPilot! I am your Autonomous Textile Negotiator. Quotation for 15,000 meters of 40s Combed Twill is currently locked at $3.20/m. How can I assist you with fabric specs, lead time, or payment terms?' }
    ]
  }
};

// State Manager
class StateManager {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load localStorage, using initial mock data.', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  get() {
    return this.state;
  }

  update(patch) {
    Object.assign(this.state, patch);
    this.saveState();
  }
}

const store = new StateManager();

// =============================================================================
// 2. THE 5 AUTONOMOUS AI AGENTS IMPLEMENTATION
// =============================================================================

const Agents = {
  /**
   * AGENT 1: Quotation Agent
   * Works with Risk Analysis Agent to generate Bill of Materials & quotation.
   * Quotation must WAIT for Admin Approval before sending to client.
   */
  quotationAgent: {
    createQuotation(fabricType, meters, deadline, specs, finish) {
      const state = store.get();
      setAgentState('Quotation Agent', 'CALCULATING');
      setAgentState('Risk Analysis Agent', 'CALCULATING');

      // 1. Risk Analysis Agent computes risk buffer
      const riskScore = Agents.riskAnalysisAgent.evaluateRisk();
      
      // 2. Bill of Materials calculation
      let baseRate = 3.20;
      if (fabricType.includes('Denim')) baseRate = 4.50;
      else if (fabricType.includes('Linen')) baseRate = 6.80;
      else if (fabricType.includes('Poly-Viscose')) baseRate = 3.65;
      else if (fabricType.includes('Poplin')) baseRate = 3.90;

      // Adjust for finishes
      if (finish.includes('Mercerized')) baseRate += 0.15;
      if (finish.includes('Teflon')) baseRate += 0.25;

      const riskBuffer = +(baseRate * (riskScore.volatilityFactor / 100)).toFixed(2);
      const finalPerMeter = +(baseRate + riskBuffer).toFixed(2);
      const totalCost = Math.round(finalPerMeter * meters);

      const newOrderCode = 'LP-' + Math.floor(7805 + Math.random() * 100);

      const newOrder = {
        id: newOrderCode,
        clientName: state.users.client.company || 'Raymond Apparel Ltd.',
        clientId: state.users.client.id,
        supervisorId: 'sup_1',
        fabricName: fabricType,
        specs: { yarnCount: 'Custom Weave', gsm: 210, width: specs, finish: finish, weave: 'Twill / Dobby' },
        totalMeters: meters,
        producedMeters: 0,
        startDate: state.simDate,
        deadline: deadline,
        priority: 'Contract Order',
        destination: 'India Hub',
        stage: 'Quotation Preparation',
        status: 'Admin Review', // WAITING FOR ADMIN APPROVAL
        delayDays: 0,
        estDeliveryDate: deadline,
        originalQuote: {
          pricePerMeter: finalPerMeter,
          total: totalCost,
          adminApproved: false, // Must wait for Admin approval
          bom: {
            rawMaterials: Math.round(totalCost * 0.52),
            spinningWeaving: Math.round(totalCost * 0.22),
            dyeingFinishing: Math.round(totalCost * 0.12),
            riskBuffer: Math.round(totalCost * (riskScore.volatilityFactor / 100)),
            millMargin: Math.round(totalCost * 0.14)
          }
        },
        currentQuote: { pricePerMeter: finalPerMeter, total: totalCost },
        revisedQuote: null,
        advancePaid: 0,
        paymentStatus: 'Quotation Awaiting Admin Approval',
        dailyLogs: []
      };

      state.orders.unshift(newOrder);
      state.selectedOrderId = newOrderCode;

      logAgentActivity(
        'Quotation Agent + Risk Agent',
        `Prepared quotation for ${newOrderCode} (${meters.toLocaleString()}m ${fabricType}) at $${finalPerMeter}/m. Awaiting Admin Approval before client dispatch.`
      );

      store.saveState();

      setTimeout(() => {
        setAgentState('Quotation Agent', 'Waiting Admin Approval');
        setAgentState('Risk Analysis Agent', 'Tracking');
      }, 800);

      return newOrder;
    },

    recalculateForMarketHike(order, commodityName, percentIncrease) {
      setAgentState('Quotation Agent', 'RECALCULATING');
      
      const unproducedMeters = order.totalMeters - order.producedMeters;
      if (unproducedMeters <= 0) return null;

      const perMeterHike = +((order.currentQuote.pricePerMeter * (percentIncrease / 100)) * 0.55).toFixed(2);
      const newPerMeter = +(order.currentQuote.pricePerMeter + perMeterHike).toFixed(2);
      const addedCost = Math.round(unproducedMeters * perMeterHike);
      const revisedTotal = order.currentQuote.total + addedCost;

      const revisedQuote = {
        revisedPricePerMeter: newPerMeter,
        revisedTotal: revisedTotal,
        originalTotal: order.originalQuote.total,
        diff: addedCost,
        reason: `${commodityName} market index rose +${percentIncrease}%`,
        adminApprovedForClient: false, // Admin must approve communicating this to client
        soFarProducedMeters: order.producedMeters,
        remainingMeters: unproducedMeters
      };

      order.revisedQuote = revisedQuote;
      order.status = 'Price Revision Alert';

      logAgentActivity(
        'Quotation Agent',
        `Market increase recalculation for ${order.id}: +$${addedCost.toLocaleString()} difference on unproduced ${unproducedMeters.toLocaleString()}m. Alert dispatched to Admin.`
      );

      store.saveState();
      setTimeout(() => setAgentState('Quotation Agent', 'Ready'), 600);
      return revisedQuote;
    }
  },

  /**
   * AGENT 2: Risk Analysis Agent
   * Daily tracking of raw materials and volatility risk.
   * CRITICAL RULE: If price INCREASES, alerts Admin only & triggers Quotation Agent.
   * If price DECREASES, it will NOT alert or update to client.
   */
  riskAnalysisAgent: {
    evaluateRisk() {
      const state = store.get();
      const cotton = state.commodities.cotton;
      const isHigher = cotton.price > cotton.baseline;
      return {
        volatilityFactor: isHigher ? 4.8 : 2.5,
        riskLevel: isHigher ? 'Moderate Risk' : 'Low Risk',
        cottonTrend: cotton.trend
      };
    },

    updateMarketPrice(commodityKey, newPrice) {
      const state = store.get();
      const item = state.commodities[commodityKey];
      if (!item) return;

      const oldPrice = item.price;
      item.price = +newPrice.toFixed(2);
      const diffPercent = +(((newPrice - oldPrice) / oldPrice) * 100).toFixed(1);
      item.trend = (diffPercent >= 0 ? '+' : '') + diffPercent + '%';

      setAgentState('Risk Analysis Agent', 'PRICE EVALUATION');

      if (diffPercent > 0) {
        // PRICE INCREASED:
        // Alert ADMIN ONLY and trigger Quotation Agent for active orders
        logAgentActivity(
          'Risk Analysis Agent',
          `[ADMIN ALERT ONLY] ${item.name} rose by ${item.trend} to $${item.price}/${item.unit}. Triggering Quotation Agent re-assessment.`
        );

        showToast(`Market Alert (Admin Only): ${item.name} surged ${item.trend}. Evaluating affected orders.`, 'warning');

        // Trigger Quotation Agent for all active in-production orders
        state.orders.forEach(order => {
          if (order.status === 'In Production' || order.status === 'Price Revision Alert') {
            Agents.quotationAgent.recalculateForMarketHike(order, item.name, diffPercent);
          }
        });
      } else {
        // PRICE DECREASED:
        // RULE: "if the market price is decreased it wont update to client"
        logAgentActivity(
          'Risk Analysis Agent',
          `[INTERNAL LOG] ${item.name} softened by ${item.trend} to $${item.price}/${item.unit}. Margin absorbed by mill; no price decrease updated to client.`
        );
        showToast(`Internal Market Notice: ${item.name} dipped ${item.trend}. Mill margin buffer retained; no client update triggered.`, 'info');
      }

      store.saveState();
      setTimeout(() => setAgentState('Risk Analysis Agent', 'Tracking'), 600);
    }
  },

  /**
   * AGENT 3: Production Agent
   * Runs daily from production start to delivery date.
   * Compares today's reported work vs required average work; calculates delay.
   */
  productionAgent: {
    runDailyAnalysis(order, todayOutput, loomsRunning, weaversPresent, notes) {
      setAgentState('Production Agent', 'ANALYZING RUN-RATE');
      setAgentState('Risk Analysis Agent', 'SYNCED');

      const unproduced = order.totalMeters - (order.producedMeters + todayOutput);
      const remainingDays = getDaysRemaining(order.deadline);
      const targetDailyRunRate = Math.max(1, Math.round(unproduced / Math.max(1, remainingDays)));

      let delayDays = 0;
      let estDeliveryDate = order.deadline;

      if (todayOutput < targetDailyRunRate) {
        // Shortfall detected
        const shortfall = targetDailyRunRate - todayOutput;
        const daysNeededAtCurrentPace = Math.ceil(unproduced / Math.max(1, todayOutput));
        delayDays = Math.max(0, daysNeededAtCurrentPace - remainingDays);
        
        if (delayDays > 0) {
          order.status = 'Delayed';
          order.delayDays = delayDays;
          estDeliveryDate = addDaysToDate(order.deadline, delayDays);
          order.estDeliveryDate = estDeliveryDate;

          logAgentActivity(
            'Production Agent',
            `[DELAY WARNING] Order ${order.id}: Output ${todayOutput}m/day fell short of required ${targetDailyRunRate}m/day. Projected delay: ${delayDays} day(s). Alerts sent to Supervisor and Admin.`
          );

          showToast(`Production Alert: Order ${order.id} is lagging target pace by ${shortfall}m! Projected delay: +${delayDays} day(s).`, 'warning');
        }
      } else {
        order.delayDays = 0;
        if (order.status === 'Delayed') order.status = 'In Production';
        logAgentActivity(
          'Production Agent',
          `Order ${order.id}: Output ${todayOutput}m surpassed target ${targetDailyRunRate}m/day. On schedule for delivery on ${order.deadline}.`
        );
      }

      // Update Order Produced Meters
      order.producedMeters += todayOutput;
      if (order.producedMeters >= order.totalMeters) {
        order.producedMeters = order.totalMeters;
        order.stage = 'Delivered';
        order.status = 'Delivered';
        // Trigger Payment Follow-up Agent
        Agents.paymentFollowUpAgent.triggerDeliveryPaymentAlert(order);
      }

      // Add to Daily History Logs
      const state = store.get();
      order.dailyLogs.unshift({
        day: `Day ${state.simDay} (${formatDate(state.simDate)})`,
        loomsRunning: loomsRunning,
        weaversPresent: weaversPresent,
        producedToday: todayOutput,
        scrapMeters: Math.round(todayOutput * 0.015),
        stage: order.stage,
        notes: notes || 'Standard shift running.',
        targetRunRate: targetDailyRunRate,
        delayEst: delayDays
      });

      store.saveState();
      setTimeout(() => setAgentState('Production Agent', 'Daily Active'), 700);
      return { targetDailyRunRate, delayDays, estDeliveryDate };
    }
  },

  /**
   * AGENT 4: Bargaining / Negotiation Agent
   * Handles queries, counter-proposals & price hike negotiations with client.
   */
  bargainingAgent: {
    handleClientMessage(orderId, userText) {
      setAgentState('Bargaining Agent', 'NEGOTIATING');
      const state = store.get();
      const order = state.orders.find(o => o.id === orderId);
      
      let reply = '';
      const text = userText.toLowerCase();

      if (text.includes('volume discount') || text.includes('4%') || text.includes('discount')) {
        reply = `We appreciate your bulk partnership! If ${order?.clientName || 'your team'} can authorize a 50% advance deposit instead of 30%, we can approve an instant 3.2% concession ($0.12/m off), protecting your margins while securing loom priority.`;
      } else if (text.includes('cotton') || text.includes('hike') || text.includes('surcharge') || text.includes('explain')) {
        reply = `Transparency is our core standard: Shankar-6 raw cotton escalated +14.2% on the commodity exchange. Importantly, LoomPilot has absorbed 100% of the cost for the ${order?.producedMeters?.toLocaleString() || 'items'} meters already woven. The revised surcharge applies solely to the remaining unproduced yardage.`;
      } else if (text.includes('advance') || text.includes('50%')) {
        reply = `Proposal approved! For a 50% advance commitment, our autonomous pricing matrix locks in a $0.15/m discount. I will draft the formal addendum for your digital confirmation.`;
      } else if (text.includes('accept') || text.includes('proceed') || text.includes('agree')) {
        if (order && order.revisedQuote) {
          order.currentQuote.pricePerMeter = order.revisedQuote.revisedPricePerMeter;
          order.currentQuote.total = order.revisedQuote.revisedTotal;
          order.status = 'In Production';
          order.revisedQuote = null;
          reply = `Agreement finalized! Order ${order.id} has been formally updated to the agreed quotation of $${order.currentQuote.pricePerMeter}/m ($${order.currentQuote.total.toLocaleString()} total). Production is proceeding smoothly.`;
          logAgentActivity('Bargaining Agent', `Client agreed to revised terms for ${order.id}. Order updated to new quotation.`);
          showToast(`Bargaining Concluded: Order ${order.id} successfully updated with new agreed terms!`, 'success');
        } else {
          reply = `Thank you! Quotation confirmed. Our production scheduler has queued yarn beams for the next weave cycle.`;
        }
      } else {
        reply = `Understood. In textile contract ${orderId}, our priority is delivery reliability and fiber quality. Let me know if you would like to negotiate terms, split roll shipments, or expedite finishing.`;
      }

      // Add to Chat transcript
      if (!state.chatTranscripts[orderId]) state.chatTranscripts[orderId] = [];
      state.chatTranscripts[orderId].push({
        sender: 'user',
        name: state.users.client.name,
        time: getCurrentTimeString(),
        text: userText
      });

      setTimeout(() => {
        state.chatTranscripts[orderId].push({
          sender: 'agent',
          name: 'AI Bargaining Agent',
          time: getCurrentTimeString(),
          text: reply
        });
        store.saveState();
        renderChatDrawerMessages(orderId);
        setAgentState('Bargaining Agent', 'Active');
      }, 700);

      store.saveState();
    }
  },

  /**
   * AGENT 5: Payment Follow-up Agent
   * Runs after delivering the product and for advance milestones.
   * Sends alert messages to the Client and the Admin.
   */
  paymentFollowUpAgent: {
    triggerDeliveryPaymentAlert(order) {
      setAgentState('Payment Follow-up', 'DISPATCHING ALERTS');
      const state = store.get();
      const balance = order.currentQuote.total - order.advancePaid;

      order.paymentStatus = `Final Balance Due: $${balance.toLocaleString()}`;

      logAgentActivity(
        'Payment Follow-up',
        `[POST-DELIVERY ALERT] Order ${order.id} delivered. Automated reminder sent to ${order.clientName} and Admin for balance collection ($${balance.toLocaleString()}).`
      );

      showToast(`Payment Follow-up: Order ${order.id} delivered! Invoice notification dispatched to client and admin.`, 'info');

      store.saveState();
      setTimeout(() => setAgentState('Payment Follow-up', 'Monitoring'), 600);
    }
  }
};

// =============================================================================
// 3. UI RENDERING ENGINES FOR EACH ROLE
// =============================================================================

function renderApp() {
  const state = store.get();

  // 1. Top bar & indicators
  updateTopBar();
  // 2. Metrics row based on active role
  renderMetricsRow();
  // 3. Dynamic Tabs based on active role
  renderViewTabs();
  // 4. Main content view based on active tab & role
  renderMainView();
  // 5. Right panel with selected order details
  renderRightPanel();
  // 6. Update Agent live matrix badges
  updateAgentMatrix();
}

function updateTopBar() {
  const state = store.get();
  
  // Update Profile in Sidebar
  const user = state.users[state.currentRole];
  const rolePill = document.getElementById('sidebarRolePill');
  if (rolePill) rolePill.textContent = state.currentRole.toUpperCase();

  // Role Buttons active state
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === state.currentRole);
  });

  // Date Display
  const simDateEl = document.getElementById('simDateDisplay');
  if (simDateEl) simDateEl.innerHTML = `Day ${state.simDay} &bull; ${formatDate(state.simDate)}`;

  // Clock
  const clockEl = document.getElementById('clockTime');
  if (clockEl) clockEl.textContent = getCurrentTimeString();
}

function renderMetricsRow() {
  const state = store.get();
  const role = state.currentRole;

  const stat1Label = document.getElementById('stat1Label');
  const stat1Value = document.getElementById('stat1Value');
  const stat1Trend = document.getElementById('stat1Trend');
  const stat1TrendText = document.getElementById('stat1TrendText');

  const stat2Label = document.getElementById('stat2Label');
  const stat2Value = document.getElementById('stat2Value');
  const stat2Trend = document.getElementById('stat2Trend');
  const stat2TrendText = document.getElementById('stat2TrendText');

  const stat3Label = document.getElementById('stat3Label');
  const stat3Value = document.getElementById('stat3Value');
  const stat3Trend = document.getElementById('stat3Trend');
  const stat3TrendText = document.getElementById('stat3TrendText');

  const agentHeaderStatus = document.getElementById('agentHeaderStatus');
  const agentSubtext = document.getElementById('agentSubtext');

  if (role === 'admin') {
    stat1Label.textContent = 'Active Loom Yardage';
    const totalMeters = state.orders.reduce((sum, o) => sum + o.totalMeters, 0);
    const producedMeters = state.orders.reduce((sum, o) => sum + o.producedMeters, 0);
    stat1Value.textContent = `${producedMeters.toLocaleString()} / ${totalMeters.toLocaleString()} m`;
    stat1TrendText.textContent = `${Math.round((producedMeters / totalMeters) * 100)}% overall completion`;

    stat2Label.textContent = 'Delay Avoidance Index';
    stat2Value.textContent = '97.4%';
    stat2TrendText.textContent = '0 Critical Loom Halts';

    stat3Label.textContent = 'Raw Cotton Market';
    stat3Value.textContent = `$${state.commodities.cotton.price}/kg`;
    stat3TrendText.textContent = `${state.commodities.cotton.trend} vs baseline`;

    agentHeaderStatus.textContent = '5 Agents Live';
    agentSubtext.textContent = 'Quotation & Risk Agent in sync. Daily reports logged.';
  } else if (role === 'supervisor') {
    stat1Label.textContent = 'Assigned Airjet Looms';
    stat1Value.textContent = '18 / 20 Running';
    stat1TrendText.textContent = '90% Operational Uptime';

    stat2Label.textContent = 'Today Shift Output';
    stat2Value.textContent = '1,100 m';
    stat2TrendText.textContent = '+5.2% vs Daily Target';

    stat3Label.textContent = 'Weavers & Labor';
    stat3Value.textContent = '24 / 26 Present';
    stat3TrendText.textContent = '92% Shift Attendance';

    agentHeaderStatus.textContent = 'Production Agent Active';
    agentSubtext.textContent = 'Analyzing today\'s run-rate vs required delivery pace.';
  } else if (role === 'client') {
    stat1Label.textContent = 'My Active Orders';
    const clientOrders = state.orders.filter(o => o.clientId === state.users.client.id);
    const totalClientMeters = clientOrders.reduce((s, o) => s + o.totalMeters, 0);
    stat1Value.textContent = `${clientOrders.length} Orders (${totalClientMeters.toLocaleString()} m)`;
    stat1TrendText.textContent = 'Production Monitored';

    stat2Label.textContent = 'Woven Yardage Progress';
    const wovenClientMeters = clientOrders.reduce((s, o) => s + o.producedMeters, 0);
    stat2Value.textContent = `${wovenClientMeters.toLocaleString()} m`;
    const pct = totalClientMeters > 0 ? Math.round((wovenClientMeters / totalClientMeters) * 100) : 0;
    stat2TrendText.textContent = `${pct}% Fabric Ready`;

    stat3Label.textContent = 'Next Delivery Date';
    stat3Value.textContent = '05 Nov 2026';
    stat3TrendText.textContent = 'On Track (Airjet Line A4)';

    agentHeaderStatus.textContent = 'Bargaining Agent Online';
    agentSubtext.textContent = 'Ask queries, review BOM or negotiate pricing directly.';
  }
}

function renderViewTabs() {
  const state = store.get();
  const tabsList = document.getElementById('viewTabsList');
  const actionContainer = document.getElementById('viewActionContainer');
  if (!tabsList) return;

  tabsList.innerHTML = '';
  actionContainer.innerHTML = '';

  let tabs = [];

  if (state.currentRole === 'admin') {
    tabs = [
      { id: 'orders', label: 'All Orders & Stages', badge: state.orders.length },
      { id: 'quotations', label: 'Quotations & Price Approvals', badge: getPendingQuotesCount() },
      { id: 'floor', label: 'Daily Floor Reports & History' },
      { id: 'market', label: 'Raw Materials & Risk Matrix' },
      { id: 'agents', label: 'Agent Control Center' }
    ];
  } else if (state.currentRole === 'supervisor') {
    tabs = [
      { id: 'assigned', label: 'My Assigned Orders', badge: 2 },
      { id: 'dailyLog', label: 'Submit Daily Production Log' },
      { id: 'runrate', label: 'Run-Rate vs Delay Analysis' }
    ];
    actionContainer.innerHTML = `
      <button class="view-action-btn" id="btnQuickSubmitLog">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Submit Floor Log</span>
      </button>
    `;
  } else if (state.currentRole === 'client') {
    tabs = [
      { id: 'clientOrders', label: 'My Orders & Pipeline', badge: 2 },
      { id: 'clientQuotes', label: 'Quotations & AI Bargaining', badge: 1 },
      { id: 'clientPayments', label: 'Invoices & Milestone Payments' }
    ];
    actionContainer.innerHTML = `
      <button class="view-action-btn" id="btnOpenNewQuoteModal">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>+ Request New Quotation</span>
      </button>
    `;
  }

  // Ensure currentTab exists in tabs
  const validTab = tabs.find(t => t.id === state.currentTab);
  if (!validTab) state.currentTab = tabs[0].id;

  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `view-tab-btn ${tab.id === state.currentTab ? 'active' : ''}`;
    btn.innerHTML = `
      <span>${tab.label}</span>
      ${tab.badge !== undefined ? `<span class="tab-badge">${tab.badge}</span>` : ''}
    `;
    btn.addEventListener('click', () => {
      state.currentTab = tab.id;
      store.saveState();
      renderApp();
    });
    tabsList.appendChild(btn);
  });

  // Attach action button events
  const quoteModalBtn = document.getElementById('btnOpenNewQuoteModal');
  if (quoteModalBtn) {
    quoteModalBtn.addEventListener('click', () => openModal('quoteModal'));
  }
  const quickLogBtn = document.getElementById('btnQuickSubmitLog');
  if (quickLogBtn) {
    quickLogBtn.addEventListener('click', () => {
      state.currentTab = 'dailyLog';
      store.saveState();
      renderApp();
    });
  }
}

function renderMainView() {
  const state = store.get();
  const container = document.getElementById('mainViewContainer');
  if (!container) return;

  container.innerHTML = '';

  const tab = state.currentTab;

  if (tab === 'orders') {
    renderAdminOrdersView(container);
  } else if (tab === 'quotations') {
    renderAdminQuotationsView(container);
  } else if (tab === 'floor') {
    renderAdminFloorReportsView(container);
  } else if (tab === 'market') {
    renderMarketRiskView(container);
  } else if (tab === 'agents') {
    renderAgentsControlView(container);
  } else if (tab === 'assigned') {
    renderSupervisorAssignedView(container);
  } else if (tab === 'dailyLog') {
    renderSupervisorDailyLogForm(container);
  } else if (tab === 'runrate') {
    renderSupervisorRunRateView(container);
  } else if (tab === 'clientOrders') {
    renderClientOrdersView(container);
  } else if (tab === 'clientQuotes') {
    renderClientQuotesView(container);
  } else if (tab === 'clientPayments') {
    renderClientPaymentsView(container);
  }
}

// -----------------------------------------------------------------------------
// 3.1 ADMIN VIEWS
// -----------------------------------------------------------------------------

function renderAdminOrdersView(container) {
  const state = store.get();
  
  // Table Header
  const header = document.createElement('div');
  header.className = 'orders-table-header';
  header.innerHTML = `
    <span class="col-head">Order Code</span>
    <span class="col-head">Fabric & Specs</span>
    <span class="col-head">Client</span>
    <span class="col-head">Total (m)</span>
    <span class="col-head">Stage</span>
    <span class="col-head">Status</span>
    <span class="col-head"></span>
  `;
  container.appendChild(header);

  // Rows List
  const list = document.createElement('div');
  list.className = 'orders-rows-list';

  state.orders.forEach(order => {
    const isSelected = order.id === state.selectedOrderId;
    const row = document.createElement('div');
    row.className = `order-row ${isSelected ? 'active-selected-row' : ''}`;
    
    let statusClass = 'status-inprod';
    if (order.status === 'Delayed') statusClass = 'status-delay';
    else if (order.status === 'Admin Review') statusClass = 'status-review';
    else if (order.status === 'Price Revision Alert') statusClass = 'status-hike';
    else if (order.status === 'Delivered') statusClass = 'status-delivered';

    row.innerHTML = `
      <span class="cell cell-code">${order.id}</span>
      <span class="cell cell-fabric">
        ${order.fabricName}
        <span class="cell-subtext">${order.specs.yarnCount || ''} &bull; ${order.specs.gsm || ''} GSM</span>
      </span>
      <span class="cell cell-client">${order.clientName}</span>
      <span class="cell cell-qty">${order.totalMeters.toLocaleString()} m</span>
      <span class="cell cell-stage">${order.stage}</span>
      <span class="cell cell-status">
        <span class="status-pill ${statusClass}">${order.status}</span>
      </span>
      <button class="cell-action-btn" title="View Order Stage Audit">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
    `;

    row.addEventListener('click', (e) => {
      state.selectedOrderId = order.id;
      store.saveState();
      renderApp();
      if (e.target.closest('.cell-action-btn')) {
        openHistoryModal(order.id);
      }
    });

    list.appendChild(row);
  });

  container.appendChild(list);
}

function renderAdminQuotationsView(container) {
  const state = store.get();
  
  const grid = document.createElement('div');
  grid.className = 'quotations-grid';

  state.orders.forEach(order => {
    const isPendingAdmin = !order.originalQuote.adminApproved;
    const hasHike = order.revisedQuote !== null;

    if (!isPendingAdmin && !hasHike) return;

    const card = document.createElement('div');
    card.className = `quote-card ${hasHike ? 'price-hike-card' : ''}`;

    let badgeHtml = '';
    if (isPendingAdmin) {
      badgeHtml = `<span class="quote-card-badge badge-pending">Agent Quote: Needs Admin Approval</span>`;
    } else if (hasHike) {
      badgeHtml = `<span class="quote-card-badge badge-hike">Price Hike Alert: Diff +$${order.revisedQuote.diff.toLocaleString()}</span>`;
    }

    const bom = order.originalQuote.bom || {};

    card.innerHTML = `
      ${badgeHtml}
      <div>
        <h3 class="quote-title">${order.fabricName} (${order.id})</h3>
        <p class="quote-client">Client: <strong>${order.clientName}</strong> &bull; Total: <strong>${order.totalMeters.toLocaleString()} meters</strong></p>
        
        <div class="quote-bom-list">
          <div style="font-weight: 700; color: var(--c-terracotta); margin-bottom: 2px;">
            AI Agent Bill of Materials (BOM) Breakdown:
          </div>
          ${Object.entries(bom).map(([k, v]) => `
            <div class="bom-row">
              <span style="text-transform: capitalize;">${k.replace(/([A-Z])/g, ' $1')}:</span>
              <span>$${v.toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="bom-row total-row">
            <span>Original Quote:</span>
            <span>$${order.originalQuote.pricePerMeter}/m ($${order.originalQuote.total.toLocaleString()})</span>
          </div>
          ${hasHike ? `
            <div class="bom-row total-row" style="color: #b91c1c; border-color: #fecdd3;">
              <span>Revised Quote (+Hike):</span>
              <span>$${order.revisedQuote.revisedPricePerMeter}/m ($${order.revisedQuote.revisedTotal.toLocaleString()})</span>
            </div>
            <div style="font-size: 9.5px; color: #b91c1c; margin-top: 3px;">
              Reason: ${order.revisedQuote.reason} (Absorbed produced ${order.revisedQuote.soFarProducedMeters}m).
            </div>
          ` : ''}
        </div>
      </div>

      <div class="quote-actions">
        ${isPendingAdmin ? `
          <button class="btn-approve" data-approve="${order.id}">Approve & Send to Client</button>
          <button class="btn-secondary" data-revise="${order.id}">Revise BOM</button>
        ` : ''}
        ${hasHike ? `
          <button class="btn-bargain-auth" data-authbargain="${order.id}">Authorize AI Bargaining Agent to Communicate with Client</button>
        ` : ''}
      </div>
    `;

    // Button actions
    const approveBtn = card.querySelector(`[data-approve="${order.id}"]`);
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        order.originalQuote.adminApproved = true;
        order.status = 'In Production';
        order.stage = 'Yarn Sourcing';
        logAgentActivity('Admin', `Approved quotation for ${order.id}. Order released to Client.`);
        showToast(`Quotation approved! Order ${order.id} sent to Client dashboard.`, 'success');
        store.saveState();
        renderApp();
      });
    }

    const authBargainBtn = card.querySelector(`[data-authbargain="${order.id}"]`);
    if (authBargainBtn) {
      authBargainBtn.addEventListener('click', () => {
        order.revisedQuote.adminApprovedForClient = true;
        logAgentActivity('Admin', `Authorized AI Bargaining Agent to negotiate revised quote with ${order.clientName}.`);
        showToast(`AI Bargaining Agent authorized to contact ${order.clientName} regarding price increase.`, 'success');
        store.saveState();
        renderApp();
      });
    }

    grid.appendChild(card);
  });

  if (grid.children.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: span 2; background: #ffffff; padding: 24px; border-radius: 16px; text-align: center; color: var(--c-text-muted);">
        <p style="font-size: 13px; font-weight: 700; color: var(--c-text-primary); margin-bottom: 4px;">All Quotations & Price Approvals Up to Date</p>
        <p style="font-size: 11px;">No pending initial quotes or unresolved raw material price hikes.</p>
      </div>
    `;
  }

  container.appendChild(grid);
}

function renderAdminFloorReportsView(container) {
  const state = store.get();
  
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';

  state.orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'supervisor-form-card';
    card.innerHTML = `
      <div class="form-title-wrap">
        <div>
          <span class="form-title">Order ${order.id} &bull; ${order.fabricName}</span>
          <span style="font-size: 11px; color: var(--c-text-muted); margin-left: 8px;">Supervisor: Murugan K. &bull; Shed A</span>
        </div>
        <button class="view-action-btn" style="padding: 4px 10px; font-size: 10px;" data-viewaudit="${order.id}">Full Daily Audit Log</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; font-size: 11px;">
        <div class="analysis-stat-box">
          <div class="stat-lbl">Target Yardage</div>
          <div class="stat-val">${order.totalMeters.toLocaleString()} m</div>
        </div>
        <div class="analysis-stat-box">
          <div class="stat-lbl">Produced to Date</div>
          <div class="stat-val" style="color: var(--c-terracotta);">${order.producedMeters.toLocaleString()} m (${Math.round((order.producedMeters / order.totalMeters) * 100)}%)</div>
        </div>
        <div class="analysis-stat-box">
          <div class="stat-lbl">Current Stage</div>
          <div class="stat-val">${order.stage}</div>
        </div>
        <div class="analysis-stat-box">
          <div class="stat-lbl">Delay Forecast</div>
          <div class="stat-val" style="color: ${order.delayDays > 0 ? '#dc2626' : '#16a34a'};">${order.delayDays > 0 ? `+${order.delayDays}d Delay` : 'On Schedule'}</div>
        </div>
      </div>

      <div style="font-size: 10.5px; color: var(--c-text-secondary); background: #faf6f3; padding: 8px 10px; border-radius: 8px;">
        <strong>Latest Supervisor Log:</strong> ${order.dailyLogs[0]?.notes || 'Awaiting initial loom logs.'} 
        <span style="color: var(--c-text-muted); font-size: 9.5px; margin-left: 6px;">(${order.dailyLogs[0]?.loomsRunning || 0} looms running &bull; ${order.dailyLogs[0]?.producedToday || 0}m woven today)</span>
      </div>
    `;

    const auditBtn = card.querySelector(`[data-viewaudit="${order.id}"]`);
    if (auditBtn) {
      auditBtn.addEventListener('click', () => openHistoryModal(order.id));
    }

    wrap.appendChild(card);
  });

  container.appendChild(wrap);
}

function renderMarketRiskView(container) {
  const state = store.get();
  
  // Ticker Row
  const ticker = document.createElement('div');
  ticker.className = 'commodity-ticker-row';
  
  Object.entries(state.commodities).forEach(([k, item]) => {
    const isUp = item.trend.startsWith('+') && item.trend !== '+0.0%';
    const isDown = item.trend.startsWith('-');
    const trendColor = isUp ? 'trend-red' : (isDown ? 'trend-green' : '');

    ticker.innerHTML += `
      <div class="commodity-card">
        <div class="commodity-name">${item.name}</div>
        <div class="commodity-price">$${item.price} <span style="font-size: 11px; font-weight: 600; color: var(--c-text-muted);">/${item.unit}</span></div>
        <div class="commodity-trend ${trendColor}">
          <span>${item.trend} 30-day shift</span>
        </div>
      </div>
    `;
  });
  container.appendChild(ticker);

  // Risk Explanation Banner
  const banner = document.createElement('div');
  banner.className = 'client-hero-card';
  banner.innerHTML = `
    <h3 style="font-size: 13.5px; font-weight: 800; color: var(--c-text-primary); margin-bottom: 4px;">
      Autonomous Risk Analysis Agent & Market Rules
    </h3>
    <p style="font-size: 11px; color: var(--c-text-secondary); line-height: 1.4; margin-bottom: 8px;">
      The <strong>Risk Analysis Agent</strong> monitors live raw materials (Shankar-6 Cotton, Polyester Staple Fiber, Reactive Dyes, Power). 
      Per business rules:
    </p>
    <ul style="font-size: 10.5px; color: var(--c-text-secondary); line-height: 1.5; padding-left: 18px;">
      <li><strong>Price Increase:</strong> Risk Agent notifies <em>Admin only</em> & triggers Quotation Agent to calculate revised quotes for unproduced meters.</li>
      <li><strong>Price Decrease:</strong> The textile mill retains the margin buffer — <em>no price decrease alert is sent to clients</em>.</li>
      <li><strong>Agent Collaboration:</strong> Works with Quotation Agent at initial bidding, and with Production Agent every day.</li>
    </ul>
  `;
  container.appendChild(banner);
}

function renderAgentsControlView(container) {
  const state = store.get();
  
  const card = document.createElement('div');
  card.className = 'supervisor-form-card';
  card.innerHTML = `
    <div class="form-title-wrap">
      <span class="form-title">Multi-Agent System Control Room & Event Stream</span>
      <span class="form-badge">5 Autonomous Agents Connected</span>
    </div>

    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px;">
      <div class="analysis-stat-box" style="text-align: center;">
        <div class="stat-lbl">1. Quotation</div>
        <div class="stat-val" style="color: var(--c-terracotta);">Active</div>
      </div>
      <div class="analysis-stat-box" style="text-align: center;">
        <div class="stat-lbl">2. Risk Analysis</div>
        <div class="stat-val" style="color: #0284c7;">Tracking</div>
      </div>
      <div class="analysis-stat-box" style="text-align: center;">
        <div class="stat-lbl">3. Production</div>
        <div class="stat-val" style="color: #16a34a;">Daily Active</div>
      </div>
      <div class="analysis-stat-box" style="text-align: center;">
        <div class="stat-lbl">4. Bargaining</div>
        <div class="stat-val" style="color: #8b5cf6;">Standby</div>
      </div>
      <div class="analysis-stat-box" style="text-align: center;">
        <div class="stat-lbl">5. Payment</div>
        <div class="stat-val" style="color: #d97706;">Monitoring</div>
      </div>
    </div>

    <div style="font-size: 11px; font-weight: 700; color: var(--c-text-secondary); margin-bottom: 6px;">Live Multi-Agent Activity Stream:</div>
    <div style="display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto;">
      ${state.agentActivities.map(act => `
        <div style="background: #faf6f4; border-radius: 8px; padding: 8px 10px; font-size: 10.5px; display: flex; gap: 10px; border-left: 3px solid var(--c-terracotta);">
          <span style="font-weight: 700; color: var(--c-terracotta); min-width: 60px;">${act.time}</span>
          <span style="font-weight: 700; color: var(--c-text-primary); min-width: 140px;">${act.agent}:</span>
          <span style="color: var(--c-text-secondary);">${act.message}</span>
        </div>
      `).join('')}
    </div>
  `;
  container.appendChild(card);
}

// -----------------------------------------------------------------------------
// 3.2 SUPERVISOR VIEWS
// -----------------------------------------------------------------------------

function renderSupervisorAssignedView(container) {
  const state = store.get();
  
  const header = document.createElement('div');
  header.className = 'orders-table-header';
  header.innerHTML = `
    <span class="col-head">Order Code</span>
    <span class="col-head">Fabric & Specs</span>
    <span class="col-head">Total / Produced</span>
    <span class="col-head">Deadline</span>
    <span class="col-head">Stage</span>
    <span class="col-head">Status</span>
    <span class="col-head"></span>
  `;
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'orders-rows-list';

  state.orders.forEach(order => {
    if (order.supervisorId !== state.users.supervisor.id) return;
    const isSelected = order.id === state.selectedOrderId;

    const row = document.createElement('div');
    row.className = `order-row ${isSelected ? 'active-selected-row' : ''}`;
    
    let statusClass = order.status === 'Delayed' ? 'status-delay' : 'status-inprod';

    row.innerHTML = `
      <span class="cell cell-code">${order.id}</span>
      <span class="cell cell-fabric">${order.fabricName}</span>
      <span class="cell cell-qty">${order.producedMeters.toLocaleString()} / ${order.totalMeters.toLocaleString()} m</span>
      <span class="cell cell-dest">${order.deadline}</span>
      <span class="cell cell-stage">${order.stage}</span>
      <span class="cell cell-status">
        <span class="status-pill ${statusClass}">${order.status}</span>
      </span>
      <button class="cell-action-btn" title="Submit Log for this order">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `;

    row.addEventListener('click', () => {
      state.selectedOrderId = order.id;
      store.saveState();
      renderApp();
    });

    list.appendChild(row);
  });

  container.appendChild(list);
}

function renderSupervisorDailyLogForm(container) {
  const state = store.get();
  const selectedOrder = state.orders.find(o => o.id === state.selectedOrderId) || state.orders[0];

  const grid = document.createElement('div');
  grid.className = 'supervisor-grid';

  // Left Form Card
  const formCard = document.createElement('div');
  formCard.className = 'supervisor-form-card';
  formCard.innerHTML = `
    <div class="form-title-wrap">
      <span class="form-title">Supervisor Daily Production & Resource Entry</span>
      <span class="form-badge">Weaving Floor Shed A</span>
    </div>

    <form id="supervisorLogForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Assigned Order</label>
          <select class="form-select" id="logOrderId">
            ${state.orders.map(o => `
              <option value="${o.id}" ${o.id === selectedOrder.id ? 'selected' : ''}>
                ${o.id} - ${o.fabricName} (${o.totalMeters - o.producedMeters}m remaining)
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Production Date</label>
          <input type="text" class="form-input" value="Day ${state.simDay} &bull; ${formatDate(state.simDate)}" disabled>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Operational Looms Active</label>
          <input type="number" class="form-input" id="logLooms" min="1" max="24" value="18" required>
        </div>
        <div class="form-group">
          <label class="form-label">Weavers & Helpers Present</label>
          <input type="number" class="form-input" id="logWorkers" min="1" max="30" value="24" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Today's Fabric Woven (Meters)</label>
          <input type="number" class="form-input" id="logMeters" min="50" step="50" value="650" required>
        </div>
        <div class="form-group">
          <label class="form-label">Defect / Scrap Meters</label>
          <input type="number" class="form-input" id="logScrap" min="0" value="6">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Current Manufacturing Stage</label>
          <select class="form-select" id="logStage">
            <option value="Warping & Sizing">Warping & Sizing</option>
            <option value="Loom Weaving" selected>Loom Weaving</option>
            <option value="Dyeing & Finishing">Dyeing & Finishing</option>
            <option value="Quality Inspection">Quality Inspection</option>
            <option value="Packaging & Dispatch">Packaging & Dispatch</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Shift Notes / Mechanical Downtime</label>
          <input type="text" class="form-input" id="logNotes" value="Airjet Loom #4 weft feeder serviced. Speed steady at 850 RPM.">
        </div>
      </div>

      <button type="submit" class="form-submit-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Submit Log & Trigger Production + Risk Agent</span>
      </button>
    </form>
  `;

  // Right AI Agent Analysis Card
  const agentCard = document.createElement('div');
  agentCard.className = 'production-agent-analysis-card';
  
  const remainingMeters = selectedOrder.totalMeters - selectedOrder.producedMeters;
  const daysLeft = Math.max(1, getDaysRemaining(selectedOrder.deadline));
  const targetRunRate = Math.round(remainingMeters / daysLeft);

  agentCard.innerHTML = `
    <div class="analysis-header">
      <div class="analysis-agent-icon">AI</div>
      <div>
        <h4 style="font-size: 12px; font-weight: 800; color: var(--c-text-primary);">Production Agent Live Analysis</h4>
        <p style="font-size: 10px; color: var(--c-text-muted);">Calculates Daily Run-Rate vs Delay Probability</p>
      </div>
    </div>

    <div class="analysis-stat-box">
      <div class="analysis-stat-row">
        <span class="stat-lbl">Order:</span>
        <span class="stat-val">${selectedOrder.id}</span>
      </div>
      <div class="analysis-stat-row">
        <span class="stat-lbl">Remaining Yardage:</span>
        <span class="stat-val">${remainingMeters.toLocaleString()} m</span>
      </div>
      <div class="analysis-stat-row">
        <span class="stat-lbl">Days Left to Deadline:</span>
        <span class="stat-val">${daysLeft} days</span>
      </div>
      <div class="analysis-stat-row" style="border-top: 1px solid #ebdcd3; padding-top: 4px; margin-top: 4px;">
        <span class="stat-lbl" style="font-weight: 800; color: var(--c-terracotta);">Target Run-Rate:</span>
        <span class="stat-val" style="color: var(--c-terracotta); font-size: 13px;">${targetRunRate} m / day</span>
      </div>
    </div>

    <div style="font-size: 10px; color: var(--c-text-secondary); line-height: 1.35; background: #faf6f4; padding: 8px; border-radius: 8px;">
      💡 When you submit today's production log, the <strong>Production Agent</strong> evaluates your actual yardage against this target. 
      If today's output is lower, it calculates delivery delay days and notifies both Supervisor and Admin.
    </div>
  `;

  grid.appendChild(formCard);
  grid.appendChild(agentCard);
  container.appendChild(grid);

  // Attach submit
  const form = document.getElementById('supervisorLogForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const orderId = document.getElementById('logOrderId').value;
      const looms = +document.getElementById('logLooms').value;
      const workers = +document.getElementById('logWorkers').value;
      const meters = +document.getElementById('logMeters').value;
      const stage = document.getElementById('logStage').value;
      const notes = document.getElementById('logNotes').value;

      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        order.stage = stage;
        Agents.productionAgent.runDailyAnalysis(order, meters, looms, workers, notes);
        showToast(`Floor log submitted! Production Agent analyzed ${meters}m against daily target.`, 'success');
        store.saveState();
        renderApp();
      }
    });
  }
}

function renderSupervisorRunRateView(container) {
  renderSupervisorDailyLogForm(container);
}

// -----------------------------------------------------------------------------
// 3.3 CLIENT VIEWS
// -----------------------------------------------------------------------------

function renderClientOrdersView(container) {
  const state = store.get();
  const clientOrders = state.orders.filter(o => o.clientId === state.users.client.id);

  if (clientOrders.length === 0) {
    container.innerHTML = `<div style="background: #fff; padding: 24px; border-radius: 16px; text-align: center;">No active orders found. Click "+ Request New Quotation" above!</div>`;
    return;
  }

  clientOrders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'client-hero-card';

    // 8 Production Stages
    const stages = [
      'Quote Accepted',
      'Yarn Sourcing',
      'Warping & Sizing',
      'Loom Weaving',
      'Dyeing & Finishing',
      'Quality Check',
      'Packaging & Dispatch',
      'Delivered'
    ];

    let currentStageIndex = stages.indexOf(order.stage);
    if (currentStageIndex === -1) currentStageIndex = 0;
    if (order.stage === 'Delivered') currentStageIndex = 7;

    const fillPercent = Math.min(100, Math.round((currentStageIndex / (stages.length - 1)) * 100));

    const isPriceHike = order.status === 'Price Revision Alert' && order.revisedQuote?.adminApprovedForClient;

    card.innerHTML = `
      <div class="client-hero-top">
        <div>
          <h3 class="client-hero-title">${order.fabricName} &bull; ${order.id}</h3>
          <p class="client-hero-sub">${order.specs.yarnCount || ''} &bull; ${order.specs.gsm || ''} GSM &bull; Ordered: <strong>${order.totalMeters.toLocaleString()} m</strong></p>
        </div>
        <div style="text-align: right;">
          <span class="status-pill ${order.status === 'Delayed' ? 'status-delay' : 'status-inprod'}">${order.status}</span>
          <div style="font-size: 10px; color: var(--c-text-muted); margin-top: 3px;">Deadline: <strong>${order.deadline}</strong></div>
        </div>
      </div>

      <!-- PRICE HIKE NOTICE BANNER IF APPLICABLE -->
      ${isPriceHike ? `
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: #b91c1c;">Market Raw Material Price Update Notice</div>
            <div style="font-size: 10px; color: #881337; margin-top: 1px;">
              ${order.revisedQuote.reason}. Old: $${order.originalQuote.pricePerMeter}/m &rarr; Revised: $${order.revisedQuote.revisedPricePerMeter}/m.
              (Note: ${order.revisedQuote.soFarProducedMeters}m already woven are preserved at original price).
            </div>
          </div>
          <button class="view-action-btn" style="background: #e11d48; padding: 5px 10px; font-size: 10.5px;" data-openbargain="${order.id}">
            Negotiate with AI Agent
          </button>
        </div>
      ` : ''}

      <!-- Production Stepper -->
      <div class="production-stepper">
        <div class="stepper-track-line">
          <div class="stepper-track-fill" style="width: ${fillPercent}%;"></div>
        </div>
        ${stages.map((stg, idx) => {
          let nodeClass = '';
          if (idx < currentStageIndex) nodeClass = 'completed';
          else if (idx === currentStageIndex) nodeClass = 'current';

          return `
            <div class="step-node ${nodeClass}">
              <div class="step-circle">${idx < currentStageIndex ? '✓' : (idx + 1)}</div>
              <span class="step-title">${stg}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 11px; padding-top: 8px; border-top: 1px solid #f6ebe3;">
        <div>
          <span>Woven So Far: <strong>${order.producedMeters.toLocaleString()} m</strong> of ${order.totalMeters.toLocaleString()} m</span>
          <span style="color: var(--c-terracotta); font-weight: 700; margin-left: 8px;">(${Math.round((order.producedMeters / order.totalMeters) * 100)}%)</span>
        </div>
        <div>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 10px;" data-viewaudit="${order.id}">Daily Weaving Logs</button>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 10px; margin-left: 4px;" data-openbargain="${order.id}">Query AI Agent</button>
        </div>
      </div>
    `;

    const bargainBtns = card.querySelectorAll(`[data-openbargain="${order.id}"]`);
    bargainBtns.forEach(b => b.addEventListener('click', () => openChatDrawer(order.id)));

    const auditBtn = card.querySelector(`[data-viewaudit="${order.id}"]`);
    if (auditBtn) auditBtn.addEventListener('click', () => openHistoryModal(order.id));

    container.appendChild(card);
  });
}

function renderClientQuotesView(container) {
  renderAdminQuotationsView(container);
}

function renderClientPaymentsView(container) {
  const state = store.get();
  const clientOrders = state.orders.filter(o => o.clientId === state.users.client.id);

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';

  clientOrders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'supervisor-form-card';
    const balance = order.currentQuote.total - order.advancePaid;

    card.innerHTML = `
      <div class="form-title-wrap">
        <div>
          <span class="form-title">${order.fabricName} (${order.id})</span>
          <span style="font-size: 11px; color: var(--c-text-muted); margin-left: 6px;">Total: $${order.currentQuote.total.toLocaleString()}</span>
        </div>
        <span class="status-pill ${order.advancePaid > 0 ? 'status-paid' : 'status-review'}">${order.paymentStatus}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; font-size: 11px;">
        <div class="analysis-stat-box">
          <div class="stat-lbl">Contract Value</div>
          <div class="stat-val">$${order.currentQuote.total.toLocaleString()}</div>
        </div>
        <div class="analysis-stat-box">
          <div class="stat-lbl">Advance Paid (30%)</div>
          <div class="stat-val" style="color: #16a34a;">$${order.advancePaid.toLocaleString()}</div>
        </div>
        <div class="analysis-stat-box">
          <div class="stat-lbl">Remaining Balance</div>
          <div class="stat-val" style="color: var(--c-terracotta);">$${balance.toLocaleString()}</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        ${order.advancePaid === 0 ? `
          <button class="btn-approve" data-payadv="${order.id}">Pay 30% Advance Deposit ($${Math.round(order.currentQuote.total * 0.3).toLocaleString()})</button>
        ` : ''}
        ${balance > 0 && order.stage === 'Delivered' ? `
          <button class="btn-approve" data-paybal="${order.id}">Pay Final Balance ($${balance.toLocaleString()})</button>
        ` : ''}
        <button class="btn-secondary" data-invoice="${order.id}">Download Textile Tax Invoice</button>
      </div>
    `;

    const payAdvBtn = card.querySelector(`[data-payadv="${order.id}"]`);
    if (payAdvBtn) {
      payAdvBtn.addEventListener('click', () => {
        order.advancePaid = Math.round(order.currentQuote.total * 0.3);
        order.paymentStatus = 'Advance Paid (30%)';
        showToast(`Advance deposit received for ${order.id}! Production released.`, 'success');
        store.saveState();
        renderApp();
      });
    }

    const payBalBtn = card.querySelector(`[data-paybal="${order.id}"]`);
    if (payBalBtn) {
      payBalBtn.addEventListener('click', () => {
        order.advancePaid = order.currentQuote.total;
        order.paymentStatus = 'Paid in Full (Completed)';
        showToast(`Final payment settled for ${order.id}. Account closed with thanks!`, 'success');
        store.saveState();
        renderApp();
      });
    }

    wrap.appendChild(card);
  });

  container.appendChild(wrap);
}

// -----------------------------------------------------------------------------
// 3.4 RIGHT PANEL RENDERING
// -----------------------------------------------------------------------------

function renderRightPanel() {
  const state = store.get();
  const order = state.orders.find(o => o.id === state.selectedOrderId) || state.orders[0];
  if (!order) return;

  const specOrderCode = document.getElementById('specOrderCode');
  const specFabric = document.getElementById('specFabric');
  const specClient = document.getElementById('specClient');
  const specTotalQty = document.getElementById('specTotalQty');
  const specProducedQty = document.getElementById('specProducedQty');
  const specStage = document.getElementById('specStage');
  const specDeadline = document.getElementById('specDeadline');
  const specDelay = document.getElementById('specDelay');

  if (specOrderCode) specOrderCode.textContent = order.id;
  if (specFabric) specFabric.textContent = order.fabricName;
  if (specClient) specClient.textContent = order.clientName;
  if (specTotalQty) specTotalQty.textContent = `${order.totalMeters.toLocaleString()} meters`;
  
  const pct = Math.round((order.producedMeters / order.totalMeters) * 100);
  if (specProducedQty) specProducedQty.textContent = `${order.producedMeters.toLocaleString()} m (${pct}%)`;
  if (specStage) specStage.textContent = order.stage;
  if (specDeadline) specDeadline.textContent = order.deadline;
  
  if (specDelay) {
    if (order.delayDays > 0) {
      specDelay.textContent = `Lagging (+${order.delayDays}d Delay)`;
      specDelay.style.color = '#dc2626';
    } else {
      specDelay.textContent = 'On Track (0d)';
      specDelay.style.color = '#16a34a';
    }
  }

  // Preview Fabric Card
  const previewFabricName = document.getElementById('previewFabricName');
  const previewFabricDims = document.getElementById('previewFabricDims');
  if (previewFabricName) previewFabricName.textContent = order.fabricName.slice(0, 16);
  if (previewFabricDims) previewFabricDims.textContent = `${order.specs.gsm || 210} GSM • ${order.specs.width || '58"'}`;

  // Button Action
  const btnActionText = document.getElementById('btnMainPanelActionText');
  if (btnActionText) {
    if (state.currentRole === 'client') btnActionText.textContent = 'Negotiate / Query Quote';
    else if (state.currentRole === 'supervisor') btnActionText.textContent = 'Enter Daily Production Log';
    else btnActionText.textContent = 'View Order Stage History';
  }
}

function updateAgentMatrix() {
  // Handled dynamically via setAgentState
}

function setAgentState(agentName, statusText) {
  let badgeId = '';
  let dotId = '';

  if (agentName.includes('Quotation')) { badgeId = 'badgeAgent1'; dotId = 'dotAgent1'; }
  else if (agentName.includes('Risk')) { badgeId = 'badgeAgent2'; dotId = 'dotAgent2'; }
  else if (agentName.includes('Production')) { badgeId = 'badgeAgent3'; dotId = 'dotAgent3'; }
  else if (agentName.includes('Bargaining')) { badgeId = 'badgeAgent4'; dotId = 'dotAgent4'; }
  else if (agentName.includes('Payment')) { badgeId = 'badgeAgent5'; dotId = 'dotAgent5'; }

  const badge = document.getElementById(badgeId);
  const dot = document.getElementById(dotId);

  if (badge) badge.textContent = statusText;
  if (dot) {
    if (statusText === 'CALCULATING' || statusText === 'RECALCULATING' || statusText === 'ANALYZING RUN-RATE' || statusText === 'NEGOTIATING') {
      dot.className = 'agent-indicator-dot active';
    } else {
      dot.className = 'agent-indicator-dot';
    }
  }
}

// =============================================================================
// 4. MODALS & AI BARGAINING CHAT DRAWER
// =============================================================================

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function openHistoryModal(orderId) {
  const state = store.get();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  const titleEl = document.getElementById('historyModalTitle');
  if (titleEl) titleEl.textContent = `Order ${order.id} • Production Audit & Logs`;

  const logsContainer = document.getElementById('historyLogsContainer');
  if (logsContainer) {
    logsContainer.innerHTML = '';

    if (!order.dailyLogs || order.dailyLogs.length === 0) {
      logsContainer.innerHTML = `<div style="text-align: center; color: var(--c-text-muted); padding: 20px;">No daily logs recorded yet for this order.</div>`;
    } else {
      order.dailyLogs.forEach(log => {
        const item = document.createElement('div');
        item.style.background = '#faf6f3';
        item.style.borderRadius = '10px';
        item.style.padding = '10px 12px';
        item.style.border = '1px solid #ebdcd3';
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: var(--c-terracotta); font-size: 11.5px;">${log.day}</strong>
            <span style="font-size: 10px; font-weight: 700; color: ${log.delayEst > 0 ? '#dc2626' : '#16a34a'};">
              ${log.delayEst > 0 ? `Shortfall (+${log.delayEst}d delay)` : 'Pace On Target'}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--c-text-secondary); margin-bottom: 4px;">
            Produced: <strong>${log.producedToday} m</strong> &bull; Target Rate: <strong>${log.targetRunRate} m/day</strong> &bull; Scrap: ${log.scrapMeters} m
          </div>
          <div style="font-size: 10px; color: var(--c-text-muted);">
            Looms: ${log.loomsRunning} active &bull; Workers: ${log.weaversPresent} &bull; Stage: ${log.stage}
          </div>
          <div style="font-size: 10.5px; color: var(--c-text-primary); margin-top: 4px; font-style: italic;">
            "${log.notes}"
          </div>
        `;
        logsContainer.appendChild(item);
      });
    }
  }

  openModal('historyModal');
}

function openChatDrawer(orderId) {
  const state = store.get();
  const drawer = document.getElementById('chatDrawer');
  if (!drawer) return;

  const targetId = orderId || state.selectedOrderId || 'LP-7801';
  drawer.dataset.orderId = targetId;
  drawer.classList.add('active');

  renderChatDrawerMessages(targetId);
}

function renderChatDrawerMessages(orderId) {
  const state = store.get();
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  container.innerHTML = '';
  const messages = state.chatTranscripts[orderId] || [
    { sender: 'agent', name: 'AI Bargaining Agent', time: 'Just now', text: `Hello! I am your LoomPilot Bargaining & Quotation Agent for contract ${orderId}. Ask any specification question, negotiate pricing, or discuss delivery lead times!` }
  ];

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender === 'agent' ? 'agent-bubble' : 'user-bubble'}`;
    bubble.innerHTML = `
      <div style="font-size: 9.5px; font-weight: 700; margin-bottom: 2px; opacity: 0.85;">${msg.name}</div>
      <div>${msg.text}</div>
      <span class="chat-time-tag">${msg.time}</span>
    `;
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

// =============================================================================
// 5. TOAST NOTIFICATIONS & UTILITIES
// =============================================================================

let toastTimeout;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add('active');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 4500);
}

function logAgentActivity(agent, message) {
  const state = store.get();
  state.agentActivities.unshift({
    time: getCurrentTimeString(),
    agent: agent,
    message: message
  });
  if (state.agentActivities.length > 30) state.agentActivities.pop();
}

function getPendingQuotesCount() {
  const state = store.get();
  return state.orders.filter(o => !o.originalQuote.adminApproved || (o.revisedQuote && !o.revisedQuote.adminApprovedForClient)).length;
}

function getCurrentTimeString() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function getDaysRemaining(deadlineStr) {
  try {
    const state = store.get();
    const curr = new Date(state.simDate);
    const target = new Date(deadlineStr);
    const diff = Math.ceil((target - curr) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  } catch (e) {
    return 7;
  }
}

function addDaysToDate(dateStr, days) {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
}

// =============================================================================
// 6. EVENT LISTENERS INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Render
  renderApp();

  // 2. Role Switcher Buttons
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = store.get();
      state.currentRole = btn.dataset.role;
      store.saveState();
      renderApp();
      showToast(`Switched view to ${state.currentRole.toUpperCase()} mode.`, 'info');
    });
  });

  // 3. Profile Avatar opens Login Modal
  const profileBtn = document.getElementById('userProfileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => openModal('loginModal'));
  }

  // 4. Close Modal Buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // 5. Quick Profile Selector inside Login Modal
  document.querySelectorAll('.profile-select-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.selectrole;
      const state = store.get();
      state.currentRole = role;
      store.saveState();
      closeModal('loginModal');
      renderApp();
      showToast(`Logged in as ${state.users[role].name} (${state.users[role].roleTitle}).`, 'success');
    });
  });

  // 6. Login Modal Tabs (Quick vs Register)
  document.querySelectorAll('.login-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.login-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isReg = btn.dataset.logintab === 'register';
      document.getElementById('quickProfilesTab').style.display = isReg ? 'none' : 'block';
      document.getElementById('registerClientTab').style.display = isReg ? 'block' : 'none';
    });
  });

  // 7. Client Account Creation Form
  const regForm = document.getElementById('registerClientForm');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regClientName').value;
      const company = document.getElementById('regCompanyName').value;
      const email = document.getElementById('regEmail').value;
      
      const state = store.get();
      state.users.client.name = name;
      state.users.client.company = company;
      state.users.client.email = email;
      state.currentRole = 'client';
      store.saveState();

      closeModal('loginModal');
      renderApp();
      showToast(`Welcome ${name}! Client account created for ${company}.`, 'success');
    });
  }

  // 8. New Quotation Form (Client) -> Triggers Quotation Agent + Risk Agent
  const newQuoteForm = document.getElementById('newQuoteForm');
  if (newQuoteForm) {
    newQuoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fabric = document.getElementById('quoteFabricType').value;
      const meters = +document.getElementById('quoteMeters').value;
      const deadline = document.getElementById('quoteDeadline').value;
      const specs = document.getElementById('quoteSpecs').value;
      const finish = document.getElementById('quoteFinish').value;

      closeModal('quoteModal');
      const order = Agents.quotationAgent.createQuotation(fabric, meters, deadline, specs, finish);
      showToast(`Quotation prepared by Quotation & Risk Agent for ${meters.toLocaleString()}m! Sent to Admin for review.`, 'success');
      renderApp();
    });
  }

  // 9. Simulation Controls: Next Day (+1 Day)
  const btnNextDay = document.getElementById('btnSimNextDay');
  if (btnNextDay) {
    btnNextDay.addEventListener('click', () => {
      const state = store.get();
      state.simDay += 1;
      
      // Advance sim date by 1 day
      const d = new Date(state.simDate);
      d.setDate(d.getDate() + 1);
      state.simDate = d.toISOString().split('T')[0];

      logAgentActivity(
        'Production Agent + Risk Agent',
        `Day ${state.simDay} started. Daily production analysis & commodity rate check executed for all active orders.`
      );

      // Simulate a standard daily production increment on active orders
      state.orders.forEach(order => {
        if (order.status === 'In Production' || order.status === 'Delayed') {
          Agents.productionAgent.runDailyAnalysis(order, 680, 18, 24, 'Automated daily manufacturing run.');
        }
      });

      store.saveState();
      renderApp();
      showToast(`Day ${state.simDay} Simulated! Production Agent & Risk Agent cycles completed.`, 'info');
    });
  }

  // 10. Simulation Controls: Cotton Price Hike (+14%) -> Triggers Quotation Agent Revision
  const btnCottonSpike = document.getElementById('btnSimCottonSpike');
  if (btnCottonSpike) {
    btnCottonSpike.addEventListener('click', () => {
      const state = store.get();
      const newPrice = state.commodities.cotton.price * 1.142; // +14.2%
      Agents.riskAnalysisAgent.updateMarketPrice('cotton', newPrice);
      renderApp();
    });
  }

  // 11. Simulation Controls: Price Drop (-8%) -> Tests Rule: Decreased price NOT updated to client!
  const btnPriceDrop = document.getElementById('btnSimPriceDrop');
  if (btnPriceDrop) {
    btnPriceDrop.addEventListener('click', () => {
      const state = store.get();
      const newPrice = state.commodities.cotton.price * 0.92; // -8%
      Agents.riskAnalysisAgent.updateMarketPrice('cotton', newPrice);
      renderApp();
    });
  }

  // 12. Chat Drawer Open & Close
  const openChatBtn = document.getElementById('openChatDrawerBtn');
  if (openChatBtn) {
    openChatBtn.addEventListener('click', () => openChatDrawer());
  }

  const closeChatBtn = document.getElementById('closeChatDrawerBtn');
  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      document.getElementById('chatDrawer').classList.remove('active');
    });
  }

  // 13. Send Bargaining Message
  const chatInput = document.getElementById('chatTextInput');
  const chatSendBtn = document.getElementById('chatSendBtn');

  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    const drawer = document.getElementById('chatDrawer');
    const orderId = drawer.dataset.orderId || store.get().selectedOrderId || 'LP-7801';
    
    chatInput.value = '';
    Agents.bargainingAgent.handleClientMessage(orderId, text);
  }

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // 14. Quick Bargaining Buttons
  document.querySelectorAll('.quick-bargain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.quick;
      const drawer = document.getElementById('chatDrawer');
      const orderId = drawer.dataset.orderId || store.get().selectedOrderId || 'LP-7801';
      Agents.bargainingAgent.handleClientMessage(orderId, text);
    });
  });

  // 15. Search orders filter
  const searchInput = document.getElementById('searchOrdersInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.order-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? 'grid' : 'none';
      });
    });
  }

  // 16. Right Panel Bottom CTA Button
  const btnMainAction = document.getElementById('btnMainPanelAction');
  if (btnMainAction) {
    btnMainAction.addEventListener('click', () => {
      const state = store.get();
      if (state.currentRole === 'client') {
        openChatDrawer();
      } else if (state.currentRole === 'supervisor') {
        state.currentTab = 'dailyLog';
        store.saveState();
        renderApp();
      } else {
        openHistoryModal(state.selectedOrderId);
      }
    });
  }

  // 17. Sidebar Navigation button icons
  document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-nav .nav-btn').forEach(b => {
        b.classList.remove('active');
        const notch = b.querySelector('.active-notch');
        if (notch) notch.remove();
      });
      btn.classList.add('active');
      const notch = document.createElement('span');
      notch.className = 'active-notch';
      btn.appendChild(notch);

      const navTarget = btn.dataset.nav;
      const state = store.get();
      if (navTarget === 'orders') state.currentTab = state.currentRole === 'client' ? 'clientOrders' : (state.currentRole === 'supervisor' ? 'assigned' : 'orders');
      else if (navTarget === 'quotations') state.currentTab = state.currentRole === 'client' ? 'clientQuotes' : 'quotations';
      else if (navTarget === 'floor') state.currentTab = state.currentRole === 'supervisor' ? 'dailyLog' : 'floor';
      else if (navTarget === 'market') state.currentTab = 'market';
      else if (navTarget === 'agents') state.currentTab = 'agents';

      store.saveState();
      renderApp();
    });
  });
});
