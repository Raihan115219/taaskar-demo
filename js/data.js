/* ==========================================================================
   TAASKAR — Mock data (Bengaluru, India)
   All content here is demo data. Nothing is sent to a server.
   ========================================================================== */

window.TData = (() => {
  /* Map coordinates live in a 360 x 240 abstract city grid (see UI.mapBase). */
  const LOCATIONS = {
    christ:      { id: 'christ',      name: 'Christ University',  area: 'Hosur Road, Bengaluru',     x: 168, y: 142 },
    koramangala: { id: 'koramangala', name: 'Koramangala',        area: '5th Block, Bengaluru',      x: 230, y: 154 },
    indiranagar: { id: 'indiranagar', name: 'Indiranagar',        area: '100 Feet Road, Bengaluru',  x: 284, y: 70 },
    mgroad:      { id: 'mgroad',      name: 'MG Road',            area: 'Central Bengaluru',         x: 190, y: 64 },
    commercial:  { id: 'commercial',  name: 'Commercial Street',  area: 'Shivajinagar, Bengaluru',   x: 160, y: 34 },
    brigade:     { id: 'brigade',     name: 'Brigade Road',       area: 'Central Bengaluru',         x: 206, y: 92 },
    domlur:      { id: 'domlur',      name: 'Domlur',             area: 'HAL 2nd Stage, Bengaluru',  x: 262, y: 112 },
    lalbagh:     { id: 'lalbagh',     name: 'Lalbagh',            area: 'Basavanagudi, Bengaluru',   x: 118, y: 120 },
    jayanagar:   { id: 'jayanagar',   name: 'Jayanagar',          area: '4th Block, Bengaluru',      x: 94,  y: 178 },
    btm:         { id: 'btm',         name: 'BTM Layout',         area: '2nd Stage, Bengaluru',      x: 160, y: 206 },
    hsr:         { id: 'hsr',         name: 'HSR Layout',         area: 'Sector 2, Bengaluru',       x: 252, y: 212 },
  };

  const TASK_TYPES = {
    bring: { id: 'bring', label: 'Bring an Item', short: 'Bring', icon: 'package',       subtitle: 'Get something delivered to you.' },
    buy:   { id: 'buy',   label: 'Buy & Bring',   short: 'Buy',   icon: 'shopping-bag',  subtitle: 'Need someone to shop for you?' },
    help:  { id: 'help',  label: 'Get Help',      short: 'Help',  icon: 'hand-helping',  subtitle: 'Find someone nearby to help.' },
  };

  const CATEGORIES = {
    bring: ['Documents', 'Electronics', 'Parcel / Courier', 'Food & Tiffin', 'Keys', 'Other'],
    buy:   ['Groceries', 'Medicines', 'Stationery', 'Food & Snacks', 'Electronics', 'Other'],
    help:  ['Tech Support', 'Moving & Lifting', 'Queue Standing', 'Pet Care', 'Tutoring', 'Other'],
  };

  const PEOPLE = {
    priya:   { id: 'priya',   name: 'Priya Nair',      rating: 4.9, tasks: 64,  verified: true,  since: 'Jan 2024', tone: 1 },
    rahul:   { id: 'rahul',   name: 'Rahul Desai',     rating: 4.8, tasks: 41,  verified: true,  since: 'Jun 2024', tone: 0 },
    ananya:  { id: 'ananya',  name: 'Ananya Iyer',     rating: 4.7, tasks: 22,  verified: true,  since: 'Sep 2024', tone: 2 },
    karthik: { id: 'karthik', name: 'Karthik Reddy',   rating: 4.9, tasks: 87,  verified: true,  since: 'Nov 2023', tone: 3 },
    sneha:   { id: 'sneha',   name: 'Sneha Patil',     rating: 4.8, tasks: 53,  verified: true,  since: 'Feb 2024', tone: 1 },
    vikram:  { id: 'vikram',  name: 'Vikram Singh',    rating: 4.6, tasks: 18,  verified: false, since: 'Aug 2025', tone: 0 },
    meera:   { id: 'meera',   name: 'Meera Joshi',     rating: 4.9, tasks: 39,  verified: true,  since: 'Apr 2024', tone: 2 },
    rohan:   { id: 'rohan',   name: 'Rohan Kulkarni',  rating: 4.8, tasks: 112, verified: true,  since: 'Oct 2023', tone: 3 },
    divya:   { id: 'divya',   name: 'Divya Menon',     rating: 4.9, tasks: 76,  verified: true,  since: 'Dec 2023', tone: 1 },
    arjun:   { id: 'arjun',   name: 'Arjun Rao',       rating: 4.7, tasks: 29,  verified: true,  since: 'Mar 2025', tone: 0 },
    ishaan:  { id: 'ishaan',  name: 'Ishaan Bhat',     rating: 4.8, tasks: 58,  verified: true,  since: 'May 2024', tone: 2 },
  };

  /* People who may "accept" a task you publish in the demo. */
  const RUNNER_POOL = ['rohan', 'divya', 'ishaan', 'karthik', 'sneha'];

  /* Signed-in demo profile #1 — the Sender (posts tasks). */
  const ME = {
    id: 'aarav',
    name: 'Aarav Mehta',
    firstName: 'Aarav',
    phone: '+91 98765 43210',
    email: 'demo@taaskar.in',
    city: 'Bengaluru, Karnataka',
    college: 'Christ University',
    rating: 4.9,
    completed: 28,
    tasks: 28,
    verified: true,
    since: 'March 2024',
    tone: 0,
    photo: null,
  };

  /* Signed-in demo profile #2 — the Runner (delivers tasks). */
  const RUNNER = {
    id: 'rohan',
    name: 'Rohan Kulkarni',
    firstName: 'Rohan',
    phone: '+91 98765 43211',
    email: 'runner@taaskar.in',
    city: 'Bengaluru, Karnataka',
    college: 'Runner · Koramangala',
    rating: 4.8,
    completed: 112,
    tasks: 112,
    verified: true,
    since: 'October 2023',
    tone: 3,
    photo: null,
  };

  /* Demo logins for testing (mock auth only — not real accounts). */
  const DEMO_ACCOUNTS = [
    { id: 'aarav', role: 'Sender', name: 'Aarav Mehta',    email: 'demo@taaskar.in',   phone: '9876543210', password: 'Demo@1234' },
    { id: 'rohan', role: 'Runner', name: 'Rohan Kulkarni', email: 'runner@taaskar.in', phone: '9876543211', password: 'Demo@1234' },
  ];

  const min = 60 * 1000;
  const hr = 60 * min;

  /* minutesAgo is converted to an absolute timestamp when the store is seeded. */
  const TASKS = [
    {
      id: 't101', type: 'bring', title: 'Bring a laptop charger',
      description: 'I left my Dell 65W Type-C charger at my cousin\'s shop on Commercial Street. Please collect it from the counter and drop it at the Christ University main gate.',
      category: 'Electronics', pickup: 'commercial', dropoff: 'christ', distance: 2.4, reward: 120,
      eta: '35–45 min', minutesAgo: 8, requester: 'priya', status: 'open',
      instructions: 'Ask for Manoj at Shree Mobiles. The charger is packed in a blue pouch.',
      time: 'Within 1 hour',
    },
    {
      id: 't102', type: 'buy', title: 'Buy groceries',
      description: 'Weekly groceries from the Jayanagar 4th Block market: 2 kg tomatoes, 1 kg onions, coriander, 1 L Nandini milk, 12 eggs and a loaf of brown bread.',
      category: 'Groceries', pickup: 'jayanagar', dropoff: 'btm', distance: 3.1, reward: 180,
      eta: '50–60 min', minutesAgo: 15, requester: 'rahul', status: 'open', budget: 650,
      instructions: 'Please keep the bill and check the eggs for cracks.',
      time: 'Today',
    },
    {
      id: 't103', type: 'bring', title: 'Deliver printed documents',
      description: 'Two spiral-bound project reports are ready at Print Point, Koramangala 5th Block. They need to reach the CS department office before 5 PM.',
      category: 'Documents', pickup: 'koramangala', dropoff: 'christ', distance: 1.8, reward: 80,
      eta: '25–30 min', minutesAgo: 22, requester: 'ananya', status: 'open',
      instructions: 'Already paid at the shop. Mention the order name "Ananya Iyer".',
      time: 'Within 1 hour',
    },
    {
      id: 't104', type: 'help', title: 'Set up a Wi-Fi router',
      description: 'Just moved into a new flat and need help configuring an Airtel Xstream router and connecting a smart TV. Should take about 30 minutes.',
      category: 'Tech Support', pickup: 'hsr', dropoff: 'hsr', distance: 0, reward: 250,
      eta: '30–40 min', minutesAgo: 34, requester: 'karthik', status: 'open',
      instructions: 'Flat 304, Sai Residency. Security will call before letting you in.',
      time: 'Today',
    },
    {
      id: 't105', type: 'buy', title: 'Pick up prescription medicines',
      description: 'Need three medicines from Apollo Pharmacy on 100 Feet Road. Prescription photo will be shared in chat after you accept.',
      category: 'Medicines', pickup: 'indiranagar', dropoff: 'koramangala', distance: 3.6, reward: 150,
      eta: '45–55 min', minutesAgo: 41, requester: 'meera', status: 'open', budget: 900,
      instructions: 'Please check the expiry date on each strip.',
      time: 'Within 1 hour',
    },
    {
      id: 't106', type: 'bring', title: 'Collect a tailored kurta',
      description: 'Pick up a stitched kurta from Lakshmi Tailors and bring it home. Bill is already settled.',
      category: 'Parcel / Courier', pickup: 'brigade', dropoff: 'jayanagar', distance: 4.2, reward: 140,
      eta: '45–60 min', minutesAgo: 58, requester: 'vikram', status: 'open',
      instructions: 'Shop closes at 8 PM.',
      time: 'Today',
    },
    {
      id: 't107', type: 'help', title: 'Help carry boxes to 2nd floor',
      description: 'Six medium cartons of books need to go from the ground floor to the 2nd floor. No lift in the building.',
      category: 'Moving & Lifting', pickup: 'btm', dropoff: 'btm', distance: 0, reward: 200,
      eta: '20–30 min', minutesAgo: 75, requester: 'arjun', status: 'open',
      instructions: 'Near Udupi Garden signal. Call when you reach.',
      time: 'Today',
    },
    {
      id: 't108', type: 'buy', title: 'Buy filter coffee powder',
      description: '500 g of fresh filter coffee powder (70:30 blend) from Cothas or any good roastery near MG Road.',
      category: 'Food & Snacks', pickup: 'mgroad', dropoff: 'domlur', distance: 2.9, reward: 110,
      eta: '40–50 min', minutesAgo: 96, requester: 'divya', status: 'open', budget: 320,
      instructions: '',
      time: 'Today',
    },

    /* --- Tasks the signed-in user posted --- */
    {
      id: 't201', type: 'bring', title: 'Pick up a parcel from Blue Dart',
      description: 'A small parcel (books) is waiting at the Blue Dart counter in Koramangala. Tracking ID and ID proof will be shared in chat.',
      category: 'Parcel / Courier', pickup: 'koramangala', dropoff: 'christ', distance: 1.8, reward: 150,
      eta: '30–40 min', minutesAgo: 70, requester: 'aarav', status: 'in_progress', runner: 'rohan', step: 3,
      instructions: 'Counter opens at 10 AM.', time: 'Within 1 hour', postedByMe: true,
    },
    {
      id: 't202', type: 'bring', title: 'Return library books',
      description: 'Return three books to the Jayanagar public library and collect the receipt.',
      category: 'Other', pickup: 'christ', dropoff: 'jayanagar', distance: 2.6, reward: 90,
      eta: '40–50 min', minutesAgo: 190, requester: 'aarav', status: 'open',
      instructions: 'Books are with the security desk at Block 2.', time: 'Today', postedByMe: true,
    },
    {
      id: 't203', type: 'buy', title: 'Buy notebooks & stationery',
      description: '5 long-ruled notebooks, a pack of blue gel pens and a geometry box from Commercial Street.',
      category: 'Stationery', pickup: 'commercial', dropoff: 'christ', distance: 2.4, reward: 100,
      eta: '45 min', minutesAgo: 3 * 24 * 60, requester: 'aarav', status: 'completed', runner: 'sneha', step: 5,
      instructions: '', time: 'Today', postedByMe: true, budget: 450,
    },
    {
      id: 't204', type: 'help', title: 'Stand in queue at passport office',
      description: 'Hold my place in the token queue at the Koramangala Passport Seva Kendra until I arrive.',
      category: 'Queue Standing', pickup: 'koramangala', dropoff: 'koramangala', distance: 0, reward: 200,
      eta: '1 hr', minutesAgo: 6 * 24 * 60, requester: 'aarav', status: 'cancelled',
      instructions: '', time: 'Today', postedByMe: true,
    },

    /* --- Tasks the signed-in user accepted as a runner --- */
    {
      id: 't301', type: 'bring', title: 'Deliver a tiffin box',
      description: 'Collect a home-cooked lunch tiffin from my mother in Jayanagar and bring it to my office near Lalbagh West Gate.',
      category: 'Food & Tiffin', pickup: 'jayanagar', dropoff: 'lalbagh', distance: 2.2, reward: 90,
      eta: '25–35 min', minutesAgo: 25, requester: 'meera', status: 'accepted', runner: 'aarav', step: 0,
      instructions: 'Keep it upright, there is sambar inside.', time: 'Within 1 hour', acceptedByMe: true,
    },
    {
      id: 't302', type: 'buy', title: 'Buy a phone cover & screen guard',
      description: 'Spigen-style clear cover and a tempered glass for an iPhone 14 from any shop on Brigade Road.',
      category: 'Electronics', pickup: 'brigade', dropoff: 'domlur', distance: 2.7, reward: 120,
      eta: '45 min', minutesAgo: 2 * 24 * 60, requester: 'ishaan', status: 'completed', runner: 'aarav', step: 5,
      instructions: '', time: 'Today', acceptedByMe: true, budget: 700,
    },

    /* --- Past delivery by the runner demo account --- */
    {
      id: 't401', type: 'bring', title: 'Deliver a birthday cake',
      description: 'Pick up a 1 kg chocolate truffle cake from a bakery in Indiranagar and deliver it to Domlur before 7 PM.',
      category: 'Food & Tiffin', pickup: 'indiranagar', dropoff: 'domlur', distance: 1.4, reward: 130,
      eta: '25–30 min', minutesAgo: 26 * 60, requester: 'divya', status: 'completed', runner: 'rohan', step: 5,
      instructions: 'Keep the box flat.', time: 'Today',
    },
  ];

  const WALLET = { available: 2450, pending: 350, earnings: 5800, spending: 1200 };

  const TRANSACTIONS = [
    { id: 'x1', kind: 'reward',     title: 'Task reward',      note: 'Phone cover & screen guard',   amount: 120,   minutesAgo: 2 * 24 * 60 },
    { id: 'x2', kind: 'payment',    title: 'Task payment',     note: 'Pick up a parcel from Blue Dart · held in escrow', amount: -150, minutesAgo: 70 },
    { id: 'x3', kind: 'fee',        title: 'Platform fee',     note: 'Pick up a parcel from Blue Dart', amount: -15,  minutesAgo: 70 },
    { id: 'x4', kind: 'withdrawal', title: 'Withdrawal',       note: 'To HDFC Bank •••• 4821',        amount: -1000, minutesAgo: 4 * 24 * 60 },
    { id: 'x5', kind: 'topup',      title: 'Money added',      note: 'UPI · aarav@okhdfcbank',         amount: 1500,  minutesAgo: 5 * 24 * 60 },
    { id: 'x6', kind: 'reward',     title: 'Task reward',      note: 'Documents to Koramangala',       amount: 150,   minutesAgo: 7 * 24 * 60 },
    { id: 'x7', kind: 'refund',     title: 'Refund',           note: 'Queue at passport office (cancelled)', amount: 220, minutesAgo: 6 * 24 * 60 },
  ];

  const NOTIFICATIONS = [
    { id: 'n1', icon: 'bike',          title: 'Rohan is on the way',            text: 'Your parcel from Blue Dart has been picked up.', minutesAgo: 6,   read: false, task: 't201' },
    { id: 'n2', icon: 'route',         title: 'New task on your route',         text: 'Bring a laptop charger · ₹120 reward',          minutesAgo: 8,   read: false, task: 't101' },
    { id: 'n3', icon: 'clipboard-check', title: 'You accepted a task',         text: 'Deliver a tiffin box for Meera Joshi.',          minutesAgo: 25,  read: false, task: 't301' },
    { id: 'n4', icon: 'shield-check',  title: 'Payment held securely',          text: '₹165 is in escrow until you confirm delivery.', minutesAgo: 70,  read: true,  task: 't201' },
    { id: 'n5', icon: 'star',          title: 'Ishaan rated you 5 stars',       text: '"Super quick and careful. Thank you!"',         minutesAgo: 2 * 24 * 60, read: true },
    { id: 'n6', icon: 'wallet',        title: '₹120 added to your wallet',      text: 'Reward released for a completed task.',         minutesAgo: 2 * 24 * 60, read: true },
  ];

  const REVIEWS = [
    { from: 'ishaan', stars: 5, text: 'Super quick and careful. Got exactly the cover I wanted.', when: '2 days ago' },
    { from: 'priya',  stars: 5, text: 'Very polite, kept me updated on chat the whole time.',      when: '1 week ago' },
    { from: 'rahul',  stars: 4, text: 'Groceries were fresh. Arrived about 10 minutes late due to traffic.', when: '2 weeks ago' },
    { from: 'divya',  stars: 5, text: 'Reliable runner. Would definitely post again.',             when: '3 weeks ago' },
  ];

  const PAYMENT_METHODS = [
    { id: 'pm1', kind: 'upi',  label: 'UPI', detail: 'aarav@okhdfcbank', primary: true },
    { id: 'pm2', kind: 'bank', label: 'HDFC Bank', detail: 'Savings •••• 4821', primary: false },
  ];

  const SAVED_LOCATIONS = [
    { id: 'sl1', label: 'College', place: 'christ',      icon: 'graduation-cap' },
    { id: 'sl2', label: 'Home',    place: 'koramangala', icon: 'house' },
    { id: 'sl3', label: 'Gym',     place: 'indiranagar', icon: 'dumbbell' },
  ];

  /* Per-account starting data for the runner demo account. */
  const RUNNER_SEED = {
    wallet: { available: 4120, pending: 150, earnings: 18450, spending: 320 },
    transactions: [
      { id: 'rx1', kind: 'reward',     title: 'Task reward', note: 'Deliver a birthday cake',      amount: 130,   minutesAgo: 25 * 60 },
      { id: 'rx2', kind: 'withdrawal', title: 'Withdrawal',  note: 'To SBI •••• 3390',             amount: -3000, minutesAgo: 3 * 24 * 60 },
      { id: 'rx3', kind: 'reward',     title: 'Task reward', note: 'Help carry boxes in BTM',      amount: 200,   minutesAgo: 4 * 24 * 60 },
      { id: 'rx4', kind: 'reward',     title: 'Task reward', note: 'Medicines to Koramangala',     amount: 150,   minutesAgo: 5 * 24 * 60 },
    ],
    notifications: [
      { id: 'rn1', icon: 'route',       title: 'New task near you',        text: 'Bring a laptop charger · ₹120 reward',         minutesAgo: 8,  read: false, task: 't101' },
      { id: 'rn2', icon: 'package',     title: 'Aarav is waiting',         text: 'Deliver the Blue Dart parcel to Christ University.', minutesAgo: 6, read: false, task: 't201' },
      { id: 'rn3', icon: 'star',        title: 'Divya rated you 5 stars',  text: '"Cake arrived perfectly. Thank you!"',          minutesAgo: 24 * 60, read: true },
    ],
    payments: [
      { id: 'pm1', kind: 'upi',  label: 'UPI', detail: 'rohan.k@oksbi', primary: true },
      { id: 'pm2', kind: 'bank', label: 'SBI', detail: 'Savings •••• 3390', primary: false },
    ],
    savedLocations: [
      { id: 'sl1', label: 'Home', place: 'koramangala', icon: 'house' },
      { id: 'sl2', label: 'Work', place: 'brigade',     icon: 'briefcase' },
    ],
    currentLocation: 'koramangala',
    ratings: { t401: 5 },
  };

  const FAQS = [
    { q: 'How does escrow payment work?', a: 'When you publish a task, the reward and platform fee are held by TAASKAR. The runner is paid only after you confirm the task is complete.' },
    { q: 'What is the platform fee?', a: 'TAASKAR charges 10% of the reward to the requester. Runners keep 100% of the reward shown on the task.' },
    { q: 'Can I cancel a task?', a: 'Open tasks can be cancelled at any time for a full refund. Once a runner has picked up the item, raise a dispute instead.' },
    { q: 'How are runners verified?', a: 'Every runner verifies their phone number and government ID (Aadhaar or PAN). Verified users show a green badge.' },
  ];

  return { DEMO_ACCOUNTS, RUNNER, RUNNER_SEED, LOCATIONS, TASK_TYPES, CATEGORIES, PEOPLE, RUNNER_POOL, ME, TASKS, WALLET, TRANSACTIONS, NOTIFICATIONS, REVIEWS, PAYMENT_METHODS, SAVED_LOCATIONS, FAQS, min, hr };
})();
