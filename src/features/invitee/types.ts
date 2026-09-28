// Hand-written types mirroring chiguru-backend's manager-facing endpoints.

/** GET /manager/me - this person's invite on the active invited estate. */
export interface ManagerMe {
  managerId: number;
  name: string;
  phone: string | null;
  email: string | null;
  ownerId: number;
  estateId: number | null;
  farmName: string;
}

export interface Estate {
  id: number;
  farmName: string;
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
  cropName?: string | null;
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
  createdAt?: string;
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
  deviceLabel?: string;
}

export interface AdvancePayment {
  id: number;
  workGroupId: number;
  paymentDate: string;
  periodLabel: string;
  daysCount: number;
  workerCount: number;
  advancePerWorkerPerDay: string;
  totalAdvancePaid: string;
}

export interface CountWorkersResponse {
  count: number;
  description?: string;
}

export interface CreateEstateUpdateRequest {
  date: string;
  estateId?: number | null;
  workerName?: string | null;
  workGroupId?: number | null;
  blockName?: string | null;
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  notes?: string | null;
  attendanceCount?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  clientId?: string;
}

export interface EstateUpdate {
  id: number;
  date: string;
  description: string;
  photoUrl: string | null;
  createdAt: string;
}

// Must match chiguru-owner-web's expenses.tsx CATEGORIES exactly (spaced
// slashes) - these are stored as literal strings server-side, so a mismatch
// here means expenses from this app silently stop grouping with the owner app's.
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
  receiptUrl: string;
  addedBy?: string;
}

export interface Crop {
  id: number;
  name: string;
}

export interface PlanTask {
  id: number;
  estateId: number;
  cropId: number | null;
  month: string; // "YYYY-MM"
  day: number | null;
  title: string;
  details: string | null;
  category: "fertilizer" | "spray" | "irrigation" | "pruning" | "harvest" | "other";
  done: boolean;
  source: "manual" | "ai";
}

export interface NormalizedApiError {
  status: number;
  message: string;
  code?: string;
}
