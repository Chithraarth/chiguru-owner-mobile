// Hand-written types mirroring the chiguru-backend response/request shapes.
// The backend has no OpenAPI/Zod contract actually wired to its routes, so these
// are derived directly from reading src/routes/*.ts in chiguru-backend.

export interface Owner {
  id: number;
  firebaseUid: string;
  fullName: string | null;
  email: string | null;
  mobileNumber: string | null;
  profileImage: string | null;
  loginProvider: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
}

export interface OwnerMeResponse {
  owner: Owner;
  hasEstate: boolean;
}

export interface DeviceRegisterRequest {
  deviceId: string;
  deviceName?: string;
}

export interface DeviceInfo {
  id: number;
  deviceId: string;
  deviceName: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface DeviceLimitError {
  error: "device_limit";
  maxDevices: number;
  devices: DeviceInfo[];
}

export interface Estate {
  id: number;
  farmName: string;
}

export interface FarmProfile {
  id: number;
  farmName: string;
  recoveryCode: string | null;
  ownerId: number | null;
  contactPhone: string | null;
  alternatePhone: string | null;
  latitude: string | null;
  longitude: string | null;
  village: string | null;
  taluk: string | null;
  district: string | null;
  state: string | null;
  country: string;
  totalAcres: string | null;
  avgRainfallMm: string | null;
  climateZone: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupCodeResponse {
  estateId: number;
  farmName: string;
  recoveryCode: string;
}

export interface RestoreRequest {
  code: string;
}

export interface RestoreResponse {
  estateId: number;
  farmName: string;
}

export interface MyFarm {
  id: number;
  farmName: string;
  village: string | null;
  district: string | null;
}

export interface DashboardSummary {
  totalCrops: number;
  totalJobWorkers: number;
  totalContractWorkers: number;
  totalExpensesThisMonth: number;
  totalExpensesThisWeek: number;
  totalIncomeThisMonth: number;
  pendingWorkGroups: number;
  totalExpensesThisYear: number;
  totalIncomeThisYear: number;
  pendingLoanAmount: number;
  todayLabourCost: number;
  recentActivities: Array<{ type: string; description: string; date: string; amount: number }>;
}

export interface RecentAd {
  id: string;
  board: "hire_job" | "hire_rental" | "equipment" | "produce";
  title: string;
  place: string | null;
  createdAt: string;
  href: string;
}

export type PaymentType = "Per day" | "Per hour" | "Per acre" | "Per kg";
export type PayFrequency = "daily" | "weekly-5" | "weekly-6" | "weekly-7" | "monthly";

export interface WorkGroup {
  id: number;
  estateId: number;
  name: string;
  cropId: number | null;
  blockName: string | null;
  category: string | null;
  labourType: string | null;
  paymentType: PaymentType;
  rate: string;
  advancePerUnit: string | null;
  payFrequency: PayFrequency;
  expectedWorkers: number | null;
  loanTaken: string | null;
  loanNotes: string | null;
  upiId?: string | null;
  overtimeSettlement?: string;
  harvestBonusSettlement?: string;
  harvestThresholdKg?: string | null;
  harvestBonusPerKg?: string | null;
  seasonClosed: boolean;
  seasonSummary: string | null;
  // Set once the owner archives this group's account via POST
  // /work-groups/:id/clear — non-null means it's settled and moved to
  // Accounts history.
  clearedAt?: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  totalCostToDate?: number;
}

export interface CreateWorkGroupRequest {
  name: string;
  blockName?: string;
  category?: string;
  labourType?: string;
  paymentType: PaymentType;
  rate: number;
  advancePerUnit?: number;
  payFrequency: PayFrequency;
  expectedWorkers?: number;
  loanTaken?: number;
  loanNotes?: string;
  harvestThresholdKg?: number;
  harvestBonusPerKg?: number;
}

export interface Worker {
  id: number;
  estateId: number;
  name: string;
  phone: string | null;
  type: string | null;
  wageRate: string | null;
  wageUnit: string | null;
  isActive: boolean;
  faceDescriptor: string | null;
  // Saved reference photo (base64 data URL) used by the mobile-only Single
  // Person Face Attendance flow (POST /workers/face-match) - a completely
  // separate mechanism from the on-device faceDescriptor embedding above.
  photoUrl: string | null;
}

export interface Attendance {
  id: number;
  workGroupId: number;
  workerId: number;
  date: string;
  hoursWorked: string | null;
  overtimeHours: string | null;
  overtimeRate: string | null;
  wageAmount: string;
  harvestedKg: string | null;
  harvestCrop: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MarkAttendanceRequest {
  workGroupId: number;
  workerId: number;
  date: string;
  hoursWorked?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  wageAmount: number;
  harvestedKg?: number;
  harvestCrop?: string;
  deviceLabel?: string;
}

export interface OvertimeSummary {
  overtimeSettlement: string;
  pendingHours: number;
  pendingAmount: number;
  clearedAmount: number;
}

export interface HarvestBonusSummary {
  harvestBonusSettlement: string;
  pendingKg: number;
  pendingAmount: number;
  clearedAmount: number;
}

export interface SettleResult {
  clearedCount: number;
  clearedAmount: number;
}

export interface AdvancePayment {
  id: number;
  workGroupId: number;
  paymentDate: string;
  periodLabel: string | null;
  daysCount?: number;
  workerCount?: number;
  advancePerWorkerPerDay?: string;
  totalAdvancePaid: string;
  notes: string | null;
}

export interface CreateAdvancePaymentRequest {
  periodLabel: string;
  daysCount: number;
  workerCount: number;
  advancePerWorkerPerDay: number;
  paymentDate: string;
  notes?: string;
}

// A gang's day: check-in time+photo, up to 2 work-update photos in between,
// and check-out time+photo when they leave. Mirrors backend's
// groupWorkSessionsTable / web's WorkSession (attendance.tsx:37-42).
export interface WorkSession {
  id: number;
  workGroupId: number;
  date: string;
  checkInAt: string;
  checkInPhoto?: string | null;
  headcountIn?: number | null;
  updatePhotos: { takenAt: string; photo: string }[];
  checkOutAt?: string | null;
  checkOutPhoto?: string | null;
  headcountOut?: number | null;
}

export interface CreateWorkSessionRequest {
  date: string;
  checkInPhoto?: string;
  headcountIn?: number;
}

export interface AddWorkSessionUpdatePhotoRequest {
  photo: string;
}

export interface CheckoutWorkSessionRequest {
  checkOutPhoto?: string;
  headcountOut?: number | null;
}

export interface EstateUpdate {
  id: number;
  estateId: number;
  date: string;
  workerName: string | null;
  blockName: string | null;
  workGroupId: number | null;
  description: string;
  photoUrl: string | null;
  videoUrl: string | null;
  notes: string | null;
  attendanceCount: number | null;
  latitude: string | null;
  longitude: string | null;
  clientId: string | null;
  createdAt: string;
}

export interface CreateEstateUpdateRequest {
  date: string;
  description: string;
  workerName?: string;
  blockName?: string | null;
  workGroupId?: number | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  notes?: string | null;
  attendanceCount?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  clientId?: string;
}

export interface CountWorkersResponse {
  count: number;
  description?: string;
}

// Must match chiguru-owner-web's expenses.tsx CATEGORIES exactly (spaced
// slashes) - these are stored as literal strings server-side, so a mismatch
// here means expenses from this app silently stop grouping with the web app's.
export type ExpenseCategory =
  | "Fertilizer"
  | "Pesticide"
  | "Fungicide"
  | "Seeds / Seedlings"
  | "Labour"
  | "Equipment"
  | "Fuel"
  | "Water / Irrigation"
  | "Transport"
  | "Storage"
  | "Electricity"
  | "Other";

export interface Expense {
  id: number;
  estateId: number;
  date: string;
  cropId: number | null;
  cropName?: string | null;
  category: ExpenseCategory;
  amount: string;
  description: string | null;
  vendor: string | null;
  hasReceipt: boolean;
}

export interface CreateExpenseRequest {
  date: string;
  cropId?: number;
  // A custom "Other" label is sent as free text, so this isn't limited to
  // the strict preset union like the read-side Expense.category is.
  category: ExpenseCategory | string;
  amount: number;
  description?: string;
  vendor?: string;
  receiptUrl: string; // base64 data URL, required, capped ~500KB server-side
}

export interface ExpenseReceiptResponse {
  receiptUrl: string;
}

export interface Crop {
  id: number;
  estateId: number;
  name: string;
  variety: string | null;
  acres: string | null;
  season: string | null;
  blockName?: string | null;
  notes?: string | null;
}

export interface CreateCropRequest {
  name: string;
  variety?: string;
  acres?: number;
  season?: string;
  blockName?: string;
  notes?: string;
}

// ---- Sprays ----
export interface Spray {
  id: number;
  estateId: number;
  date: string;
  cropId: number | null;
  cropName?: string | null;
  blockName: string | null;
  productName: string;
  productType: string | null;
  concentrationPct: string | null;
  barrelsUsed: string | null;
  litresUsed: string | null;
  areaAcres: string | null;
  cost: string | null;
  weatherCondition: string | null;
  notes: string | null;
}

export interface CreateSprayRequest {
  date: string;
  cropId?: number;
  blockName?: string;
  productName: string;
  productType?: string;
  concentrationPct?: number;
  barrelsUsed?: number;
  litresUsed?: number;
  areaAcres?: number;
  cost?: number;
  weatherCondition?: string;
  notes?: string;
}

// ---- Harvests ----
export interface Harvest {
  id: number;
  estateId: number;
  date: string;
  cropId: number;
  cropName?: string | null;
  workGroupId: number | null;
  blockName: string | null;
  weightKg: string;
  grade: string | null;
  pricePerKg: string | null;
  totalIncome: string | null;
  buyer: string | null;
  paymentStatus: string;
  notes: string | null;
}

export interface CreateHarvestRequest {
  date: string;
  cropId: number;
  workGroupId?: number;
  blockName?: string;
  weightKg: number;
  grade?: string;
  pricePerKg?: number;
  totalIncome?: number;
  buyer?: string;
  paymentStatus?: string;
  notes?: string;
}

// ---- Loans ----
export interface Loan {
  id: number;
  estateId: number;
  workerId: number;
  workerName?: string | null;
  workGroupId: number | null;
  workGroupName?: string | null;
  amount: string;
  interestPct: string;
  totalDue: string;
  issuedDate: string;
  dueDate: string | null;
  repaidAmount: string;
  remainingAmount?: string;
  repaymentMethod: string;
  status: string;
  proofPhotoUrl: string | null;
  notes: string | null;
}

export interface CreateLoanRequest {
  workerId: number;
  workGroupId?: number;
  amount: number;
  interestPct?: number;
  issuedDate: string;
  dueDate?: string;
  repaymentMethod?: string;
  proofPhotoUrl?: string;
  notes?: string;
}

// A loan as returned by GET /work-groups/:id/loans - joined with worker/group
// names and a precomputed remainingAmount, unlike the plain Loan type above.
export interface GroupLoan {
  id: number;
  workerId: number | null;
  workerName: string | null;
  workGroupId: number | null;
  workGroupName: string | null;
  amount: string;
  totalDue: string;
  repaidAmount: string;
  issuedDate: string;
  dueDate: string | null;
  status: string;
  remainingAmount: number;
  notes: string | null;
  proofPhotoUrl?: string | null;
  createdAt?: string;
}

// ---- Worker payments (direct cash/UPI/bank/wallet payouts) ----
export interface WorkerPayment {
  id: number;
  workerId: number | null;
  workGroupId: number | null;
  payeeName: string;
  amount: string;
  method: "cash" | "upi" | "bank" | "wallet" | "other";
  methodLabel: string | null;
  payeeHandle: string | null;
  paymentDate: string;
  note: string | null;
  createdAt?: string;
}

export interface CreateWorkerPaymentRequest {
  workerId?: number | null;
  workGroupId?: number | null;
  payeeName: string;
  amount: number;
  method: "cash" | "upi" | "bank" | "wallet" | "other";
  methodLabel?: string;
  payeeHandle?: string | null;
  paymentDate: string;
  note?: string | null;
  clientId: string;
}

// Attendance joined with worker/group names, as returned by GET /attendance
// (the plain Attendance type above omits these joined fields).
export interface AttendanceRecord {
  id: number;
  workGroupId: number | null;
  workGroupName: string | null;
  workerId: number;
  workerName: string | null;
  date: string;
  hoursWorked: string | null;
  overtimeHours?: string | null;
  overtimeRate?: string | null;
  wageAmount: string | null;
  harvestedKg?: string | null;
  harvestCrop?: string | null;
  notes: string | null;
  createdAt?: string | null;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  date: string;
  amount: string;
  method: string | null;
  notes: string | null;
}

export interface CreateLoanPaymentRequest {
  date: string;
  amount: number;
  method?: string;
  notes?: string;
}

// ---- Reports ----
export interface SeasonReportCrop {
  cropId: number;
  cropName: string;
  acres: number;
  totalYieldKg: number;
  totalIncome: number;
  labourCost: number;
  fertilizerCost: number;
  sprayCost: number;
  otherCost: number;
  totalExpenses: number;
  netProfit: number;
  profitPerAcre: number;
}

export interface SeasonReport {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  crops: SeasonReportCrop[];
}

export interface MonthlyReportCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyReport {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  netProfit: number;
  breakdown: MonthlyReportCategory[];
}

export interface WeeklyReportDay {
  date: string;
  income: number;
  expenses: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  days: WeeklyReportDay[];
}

// ---- Listings (marketplace / equipment / hire) ----
export interface ListingBase {
  id: number;
  sellerName: string;
  phone: string;
  whatsapp: string | null;
  location: string;
  description: string | null;
  photoUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
  mine?: boolean;
}

export interface ProduceListing extends ListingBase {
  productName: string;
  category: string;
  price: string;
  unit: string;
  quantity: string | null;
}

export interface CreateProduceListingRequest {
  sellerName: string;
  phone: string;
  whatsapp?: string;
  productName: string;
  category: string;
  price: number;
  unit?: string;
  quantity?: string;
  location: string;
  description?: string;
  photoUrl?: string;
  ownerKey: string;
}

export interface EquipmentListing extends ListingBase {
  title: string;
  category: string;
  condition: "new" | "used";
  price: string;
}

export interface CreateEquipmentListingRequest {
  sellerName: string;
  phone: string;
  whatsapp?: string;
  title: string;
  category: string;
  condition: "new" | "used";
  price: number;
  location: string;
  description?: string;
  photoUrl?: string;
  ownerKey: string;
}

export interface HireListing {
  id: number;
  listingType: "rental" | "job";
  category: string;
  title: string;
  posterName: string;
  phone: string;
  whatsapp: string | null;
  district: string | null;
  taluk: string | null;
  village: string | null;
  latitude: string | null;
  longitude: string | null;
  rate: string | null;
  workersNeeded: number | null;
  description: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  mine?: boolean;
}

export interface CreateHireListingRequest {
  listingType: "rental" | "job";
  category: string;
  title: string;
  posterName: string;
  phone: string;
  whatsapp?: string;
  district?: string;
  taluk?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  rate?: string;
  workersNeeded?: number;
  description?: string;
  photoUrl?: string;
  ownerKey: string;
}

// ---- Nursery ----
export interface NurseryVendor {
  id: number;
  type: "nursery" | "supplies";
  name: string;
  phone: string;
  whatsapp: string | null;
  location: string;
  description: string | null;
  speciality: string | null;
  photoUrl: string | null;
  status: "pending" | "approved" | "suspended";
  adminNotes?: string | null;
  isActive: boolean;
  createdAt?: string;
  listingCount?: number;
  avgRating?: number;
  ratingCount?: number;
  listings?: NurseryListing[];
  ratings?: NurseryRating[];
}

export interface NurseryRating {
  id: number;
  vendorId: number;
  rating: number;
  comment: string | null;
  raterName: string | null;
  createdAt?: string;
}

export interface NurseryListing {
  id: number;
  type: "nursery" | "supplies";
  vendorId: number;
  vendorName?: string;
  vendorPhone?: string | null;
  vendorLocation?: string;
  name: string;
  category: string | null;
  price: string;
  unit: string;
  qtyAvailable: number;
  description: string | null;
  photoUrl: string | null;
  isAvailable: boolean;
  createdAt?: string;
}

// ---- Mandi ----
export interface MandiPrice {
  id: number;
  date: string;
  crop: string;
  sellerName: string;
  sellerType: string;
  price: string;
  priceMin: string | null;
  priceMax: string | null;
  unit: string;
  priceDate: string | null;
  location: string | null;
  phone: string | null;
  notes: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

export interface MandiPricesResponse {
  date: string;
  status: "pending" | "done" | "error";
  error?: string | null;
  fetchedAt?: string | null;
  prices: MandiPrice[];
}

// ---- Ads (recent activity, already in dashboard) ----

// ---- Subscription ----
// Mirrors chiguru-backend's actual routes/subscription.ts response shapes —
// androidPlayProductId is what react-native-iap needs to launch a purchase;
// there's no server-side "create" step for Play purchases the way Razorpay
// has one on web, so the client must already know the product id up front.
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingPeriod: string;
  managerLimit: number;
  googlePlayProductId: string | null;
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
}

export interface CurrentSubscription {
  status: string;
  platform: string;
  provider: string;
  startDate: string | null;
  expiryDate: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  plan: { id: number; name: string; managerLimit: number; price: number } | null;
}

export interface SubscriptionMeResponse {
  subscription: CurrentSubscription | null;
  entitlement: {
    managerLimit: number;
    managersUsed: number;
    remainingManagers: number;
    extraManagerSeats: number;
    managerSeatAddonPrice: number;
  };
  sharePlatforms: string | null;
  shareRewardClaimedAt: string | null;
  freeMonthPending: boolean;
}

export interface ManagerSeatAddonOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface ManagerSeatAddonVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface ManagerSeatAddonVerifyResponse {
  ok: boolean;
  extraManagerSeats: number;
  duplicate: boolean;
}

export interface ShareRewardResponse {
  sharePlatforms: string | null;
  shareRewardClaimedAt: string | null;
  freeMonthPending: boolean;
  rewardGranted: boolean;
}

export interface Payment {
  id: number;
  amount: string;
  currency: string;
  paymentStatus: string;
  createdAt: string;
}

export interface VerifyAndroidPurchaseRequest {
  purchaseToken: string;
  productId: string;
}

export interface SubscriptionActionResponse {
  status: string;
  expiryDate?: string | null;
}

// ---- Wallet ----
// Mirrors chiguru-backend's routes/wallet.ts response shapes. The wallet is a
// per-use AI credit balance on top of (not instead of) the subscription,
// recharged via a real Razorpay one-time order — verified the same way
// subscription checkout is verified, never self-reported.
export interface WalletAiPrice {
  price: number;
  label: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  feature: string | null;
  amount: string;
  createdAt: string;
}

export interface WalletMeResponse {
  balance: number;
  minRechargeAmount: number;
  aiPrices: Record<string, WalletAiPrice>;
  share: {
    target: number;
    reward: number;
    platforms: string[];
    rewarded: boolean;
  };
  transactions: WalletTransaction[];
  usage: { month: { count: number; total: number } };
}

export interface WalletRechargeOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface WalletRechargeVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
}

export interface WalletRechargeVerifyResponse {
  ok: boolean;
  balance: number;
  duplicate: boolean;
}

export interface WalletShareResponse {
  platforms: string[];
  rewarded: boolean;
  creditGiven: boolean;
  balance: number;
}

// ---- Bin ----
export interface BinWorkGroup {
  id: number;
  name: string;
  deletedAt: string;
}

export interface BinWorker {
  id: number;
  name: string;
  deletedAt: string;
}

export interface BinEstateUpdate {
  id: number;
  description: string;
  deletedAt: string;
}

export interface BinResponse {
  groups: BinWorkGroup[];
  workers: BinWorker[];
  updates: BinEstateUpdate[];
  retentionDays: number;
}

// ---- Sync conflicts ----
export interface SyncConflictValue {
  hoursWorked?: string;
  wageAmount?: string;
  notes?: string | null;
}

export interface SyncConflict {
  id: number;
  entityType: string;
  entityId: number;
  workGroupId: number | null;
  workGroupName: string | null;
  summary: string;
  previousValue: SyncConflictValue | null;
  newValue: SyncConflictValue | null;
  previousDevice: string | null;
  newDevice: string | null;
  resolution: string;
  createdAt: string;
}

// ---- Help ----
export interface HelpMessage {
  id: number;
  type: "question" | "suggestion";
  message: string;
  phone?: string | null;
  status: "open" | "replied";
  reply: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

// ---- Managers ----
export interface Manager {
  id: number;
  name: string;
  phone: string;
  status: "pending" | "active" | "removed";
  createdAt: string;
  activatedAt: string | null;
}

// ---- Agri AI ----
export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ---- Disease diagnosis ----
export interface DiagnosisResult {
  id?: number | null;
  diseaseName: string;
  scientificName?: string;
  affectedCrop: string;
  confidence: "high" | "medium" | "low";
  description: string;
  visibleSymptoms?: string;
  differentials?: { name: string; note?: string }[];
  immediateSteps?: string[];
  doNotDo?: string[];
  treatmentSteps: string[];
  preventionTips: string[];
  urgency: "immediate" | "within-3-days" | "within-week" | "monitor";
  recommendedProduct?: string;
  isDisease: boolean;
}

// ---- Agri Doctor ----
export interface Agronomist {
  id: number;
  name: string;
  emoji: string | null;
  speciality: string;
  qualification: string;
  certificateUrl?: string | null;
  workplace?: string | null;
  experience: string | null;
  location: string;
  languages: string | null;
  contactPhone?: string | null;
  rating: string;
  ratePer15Min: string;
  consultationPlan?: string | null;
  bio: string | null;
  isOnline: boolean;
  payoutReady: boolean;
}

export interface AgronomistPayout {
  id: number;
  amount: string;
  method: string;
  reference: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface AgronomistEarnings {
  id: number;
  name: string;
  totalEarnings: number;
  paidOut: number;
  pending: number;
  available: number;
  payoutReady: boolean;
  payoutMethod: {
    accountHolderName: string | null;
    bankAccountNumber: string | null;
    ifscCode: string | null;
    upiId: string | null;
    panNumber: string | null;
  };
  payouts: AgronomistPayout[];
}

export interface RegisterAgronomistRequest {
  name: string;
  speciality: string;
  qualification: string;
  experience: string;
  certificateUrl: string;
  workplace?: string;
  location?: string;
  languages?: string;
  contactPhone?: string;
  ratePer15Min?: number;
  bio?: string;
  consultationPlan?: string;
  accountHolderName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  panNumber?: string;
}

export interface Consultation {
  id: number;
  agronomistId: number;
  mode: "chat" | "call";
  status: string;
  topic: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  cost: string;
}

export interface ConsultationMessage {
  id: number;
  consultationId: number;
  sender: "farmer" | "doctor";
  text: string;
  mediaType: "image" | "audio" | null;
  mediaUrl: string | null;
  createdAt: string;
}

export interface AppSettings {
  walletBalance: string;
  trialActive: boolean;
  trialDaysLeft: number;
  canUseAgriDoctor: boolean;
}

export interface AgriDoctorEndResult {
  cost: number;
  minutes: number;
  doctorEarning: number;
  platformFee: number;
  walletBalance: number;
}

// Normalized error shape. Backend actually returns either {message, code?} or {error}.
export interface NormalizedApiError {
  status: number;
  message: string;
  code?: string;
}

export interface OldLedgerYearSummary {
  year: number;
  totals: {
    expenses: number;
    income: number;
    wages: number;
    attendanceDays: number;
    workerCount: number;
    payments: number;
    advances: number;
    loansGiven: number;
  };
}

export interface OldLedgerYearDetail {
  year: number;
  expenses: { date: string; category: string; amount: string; description: string | null }[];
  expenseCategories: { category: string; total: number; count: number }[];
  harvests: { date: string; cropName: string | null; weightKg: string; totalIncome: string; buyer: string | null }[];
  workers: { name: string; days: number; earned: number }[];
  workTypes: {
    name: string;
    category: string | null;
    rate: number | null;
    paymentType: string | null;
    days: number;
    workers: number;
    wages: number;
  }[];
  payments: { date: string; payeeName: string; amount: string; method: string }[];
  advances: { date: string; groupName: string | null; amount: string; notes: string | null }[];
  loans: { date: string; workerName: string | null; amount: string; totalDue: string; repaidAmount: string; status: string }[];
}

export interface WorkerWages {
  workerId: number;
  workerName: string;
  totalDays: number;
  totalHours: number;
  totalWage: number;
  loanDeductions: number;
  netPayable: number;
  pendingLoanBalance: number;
  month: string;
}

// All-time per-worker money summary from GET /workers/:id/money — days worked,
// wages + overtime earned, loans, direct payments, and one net-due balance.
export interface WorkerMoney {
  workerId: number;
  workerName: string;
  upiId: string | null;
  totalDays: number;
  totalWage: number;
  totalOvertimeHours: number;
  totalOvertimeAmount: number;
  totalHarvestedKg: number;
  totalEarned: number;
  lastWorkedDate: string | null;
  loanTaken: number;
  loanRepaid: number;
  loanOutstanding: number;
  paymentsTotal: number;
  paymentsCount: number;
  netDue: number;
  payments: {
    id: number;
    amount: string;
    method: string;
    methodLabel: string | null;
    paymentDate: string;
    note: string | null;
  }[];
  loans: {
    id: number;
    amount: string;
    totalDue: string;
    repaidAmount: string;
    status: string;
    issuedDate: string;
  }[];
}

export interface ClearWorkGroupResult {
  clearedAt: string | null;
}

export type PlanTaskCategory = "fertilizer" | "spray" | "irrigation" | "pruning" | "harvest" | "other";

export interface PlanTask {
  id: number;
  estateId: number;
  cropId: number | null;
  month: string; // "YYYY-MM"
  day: number | null; // day of month, null = whole month
  title: string;
  details: string | null;
  category: PlanTaskCategory;
  done: boolean;
  source: "manual" | "ai";
  clientId?: string | null;
}

export interface CreatePlanTaskRequest {
  month: string;
  day?: number | null;
  title: string;
  details?: string | null;
  category: PlanTaskCategory;
  cropId?: number | null;
  clientId?: string;
}
