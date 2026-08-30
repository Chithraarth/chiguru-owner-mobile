import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, UserCheck, Camera, BookOpen, RefreshCw } from "lucide-react-native";
import { DashboardScreen } from "../features/dashboard/screens/DashboardScreen";
import { MoreScreen } from "../features/dashboard/screens/MoreScreen";
import { WorkGroupListScreen } from "../features/work-groups/screens/WorkGroupListScreen";
import { WorkGroupFormScreen } from "../features/work-groups/screens/WorkGroupFormScreen";
import { AttendanceScreen } from "../features/attendance/screens/AttendanceScreen";
import { DailyUpdateListScreen } from "../features/daily-update/screens/DailyUpdateListScreen";
import { DailyUpdateFormScreen } from "../features/daily-update/screens/DailyUpdateFormScreen";
import { FarmAccountsScreen } from "../features/farm-accounts/screens/FarmAccountsScreen";
import { OldLedgerScreen } from "../features/farm-accounts/screens/OldLedgerScreen";
import { OldLedgerDetailScreen } from "../features/farm-accounts/screens/OldLedgerDetailScreen";
import { LabourRecordsScreen } from "../features/labour-records/screens/LabourRecordsScreen";
import { EmployeeAttendanceScreen } from "../features/labour-records/screens/EmployeeAttendanceScreen";
import { ExpenseListScreen } from "../features/expenses/screens/ExpenseListScreen";
import { ExpenseFormScreen } from "../features/expenses/screens/ExpenseFormScreen";
import { CropsScreen } from "../features/crops/screens/CropsScreen";
import { CropFormScreen } from "../features/crops/screens/CropFormScreen";
import { SpraysScreen } from "../features/sprays/screens/SpraysScreen";
import { SprayFormScreen } from "../features/sprays/screens/SprayFormScreen";
import { YearPlanScreen } from "../features/year-plan/screens/YearPlanScreen";
import { PlanTaskFormScreen } from "../features/year-plan/screens/PlanTaskFormScreen";
import { HarvestsScreen } from "../features/harvests/screens/HarvestsScreen";
import { HarvestFormScreen } from "../features/harvests/screens/HarvestFormScreen";
import { LoansScreen } from "../features/loans/screens/LoansScreen";
import { LoanFormScreen } from "../features/loans/screens/LoanFormScreen";
import { ReportsScreen } from "../features/reports/screens/ReportsScreen";
import { AccountsScanScreen } from "../features/accounts-scan/screens/AccountsScanScreen";
import { ShopScreen } from "../features/shop/screens/ShopScreen";
import { MarketplaceScreen } from "../features/marketplace/screens/MarketplaceScreen";
import { MarketplaceFormScreen } from "../features/marketplace/screens/MarketplaceFormScreen";
import { EquipmentScreen } from "../features/equipment/screens/EquipmentScreen";
import { EquipmentFormScreen } from "../features/equipment/screens/EquipmentFormScreen";
import { HireScreen } from "../features/hire/screens/HireScreen";
import { HireFormScreen } from "../features/hire/screens/HireFormScreen";
import { NurseryScreen } from "../features/nursery/screens/NurseryScreen";
import { NurseryAdminScreen } from "../features/nursery/screens/NurseryAdminScreen";
import { MandiScreen } from "../features/mandi/screens/MandiScreen";
import { MyAdsScreen } from "../features/my-ads/screens/MyAdsScreen";
import { AgriAiScreen } from "../features/agri-ai/screens/AgriAiScreen";
import { DiseaseScreen } from "../features/disease/screens/DiseaseScreen";
import { AgriDoctorScreen } from "../features/agri-doctor/screens/AgriDoctorScreen";
import { AgriDoctorProfileScreen } from "../features/agri-doctor/screens/AgriDoctorProfileScreen";
import { AgriDoctorCallScreen } from "../features/agri-doctor/screens/AgriDoctorCallScreen";
import { AgriExpertHubScreen } from "../features/agri-doctor/screens/AgriExpertHubScreen";
import { AgriDoctorRegisterScreen } from "../features/agri-doctor/screens/AgriDoctorRegisterScreen";
import { AgriDoctorEarningsScreen } from "../features/agri-doctor/screens/AgriDoctorEarningsScreen";
import { ConsultationScreen } from "../features/agri-doctor/screens/ConsultationScreen";
import { SubscriptionScreen } from "../features/subscription/screens/SubscriptionScreen";
import { WalletScreen } from "../features/wallet/screens/WalletScreen";
import { BinScreen } from "../features/bin/screens/BinScreen";
import { SyncLogScreen } from "../features/sync-log/screens/SyncLogScreen";
import { ManagerDevicesScreen } from "../features/manager-devices/screens/ManagerDevicesScreen";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen";
import { HelpScreen } from "../features/help/screens/HelpScreen";
import { OnboardingScreen } from "../features/onboarding/screens/OnboardingScreen";
import { WelcomeScreen } from "../features/welcome/screens/WelcomeScreen";
import { EstateEditScreen } from "../features/estate/screens/EstateEditScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { BackupRestoreScreen } from "../features/profile/screens/BackupRestoreScreen";
import { EstateSwitcherModal } from "../features/estate/components/EstateSwitcherModal";
import { AppHeader } from "../components/AppHeader";
import { FloatingTabBar } from "../components/FloatingTabBar";
import { colors } from "../components/theme";

const Tab = createBottomTabNavigator();
const DashboardStackNav = createNativeStackNavigator();
const WorkStackNav = createNativeStackNavigator();
const UpdatesStackNav = createNativeStackNavigator();
const AccountsStackNav = createNativeStackNavigator();
const SyncStackNav = createNativeStackNavigator();

function EstateSwitcherButton() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={10} style={{ marginRight: 12 }}>
        <Text style={{ color: colors.primary, fontSize: 14 }}>Switch farm ▾</Text>
      </Pressable>
      <EstateSwitcherModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const headerOptions = {
  headerRight: () => <EstateSwitcherButton />,
};

// Screens deep-linked from the More/Shop/Farm-Accounts hubs and the drawer
// menu are registered on every stack that can navigate to them, so
// `navigation.navigate(...)` resolves no matter which tab the user started from.
function registerSharedScreens(Nav: ReturnType<typeof createNativeStackNavigator>) {
  return (
    <>
      <Nav.Screen name="Crops" component={CropsScreen} options={{ title: "Crops" }} />
      <Nav.Screen name="CropForm" component={CropFormScreen} options={{ title: "Add Crop" }} />
      <Nav.Screen name="Sprays" component={SpraysScreen} options={{ title: "Sprays" }} />
      <Nav.Screen name="SprayForm" component={SprayFormScreen} options={{ title: "Log Spray" }} />
      <Nav.Screen name="YearPlan" component={YearPlanScreen} options={{ title: "Year Plan" }} />
      <Nav.Screen name="PlanTaskForm" component={PlanTaskFormScreen} options={({ route }: any) => ({ title: route.params?.task ? "Edit Task" : "Add Task" })} />
      <Nav.Screen name="Harvests" component={HarvestsScreen} options={{ title: "Harvests" }} />
      <Nav.Screen name="HarvestForm" component={HarvestFormScreen} options={{ title: "Log Harvest" }} />
      <Nav.Screen name="Loans" component={LoansScreen} options={{ title: "Loans" }} />
      <Nav.Screen name="LoanForm" component={LoanFormScreen} options={{ title: "New Loan" }} />
      <Nav.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <Nav.Screen name="AccountsScan" component={AccountsScanScreen} options={{ title: "Scan Account Page" }} />
      <Nav.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: "Expenses" }} />
      <Nav.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "New Expense" }} />
      <Nav.Screen name="WorkGroupList" component={WorkGroupListScreen} options={{ title: "Work Groups" }} />
      <Nav.Screen name="WorkGroupForm" component={WorkGroupFormScreen} options={{ title: "New Work Group" }} />
      <Nav.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={({ route }: any) => ({ title: route.params?.workGroupName ?? "Attendance" })}
      />
      <Nav.Screen name="FarmAccounts" component={FarmAccountsScreen} options={{ title: "Farm Accounts" }} />
      <Nav.Screen name="OldLedger" component={OldLedgerScreen} options={{ title: "Old Ledger" }} />
      <Nav.Screen
        name="OldLedgerDetail"
        component={OldLedgerDetailScreen}
        options={({ route }: any) => ({ title: String(route.params?.year ?? "Year") })}
      />
      <Nav.Screen name="LabourRecords" component={LabourRecordsScreen} options={{ title: "Labour Payments & Records" }} />
      <Nav.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} options={{ title: "Employee Attendance" }} />
      <Nav.Screen name="DailyUpdateList" component={DailyUpdateListScreen} options={{ title: "Work Updates" }} />
      <Nav.Screen name="DailyUpdateForm" component={DailyUpdateFormScreen} options={{ title: "New Update" }} />
      <Nav.Screen name="Shop" component={ShopScreen} options={{ title: "Shop" }} />
      <Nav.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: "Marketplace" }} />
      <Nav.Screen name="MarketplaceForm" component={MarketplaceFormScreen} options={{ title: "Sell Produce" }} />
      <Nav.Screen name="Equipment" component={EquipmentScreen} options={{ title: "Equipment" }} />
      <Nav.Screen name="EquipmentForm" component={EquipmentFormScreen} options={{ title: "List Equipment" }} />
      <Nav.Screen name="Hire" component={HireScreen} options={{ title: "Hire Board" }} />
      <Nav.Screen name="HireForm" component={HireFormScreen} options={{ title: "Post Listing" }} />
      <Nav.Screen name="Nursery" component={NurseryScreen} options={{ title: "Nursery" }} />
      <Nav.Screen name="NurseryAdmin" component={NurseryAdminScreen} options={{ title: "Nursery Vendor Admin" }} />
      <Nav.Screen name="Mandi" component={MandiScreen} options={{ title: "Market Prices" }} />
      <Nav.Screen name="MyAds" component={MyAdsScreen} options={{ title: "My Ads" }} />
      <Nav.Screen name="AgriAi" component={AgriAiScreen} options={{ title: "AI Agri Advisor" }} />
      <Nav.Screen name="Disease" component={DiseaseScreen} options={{ title: "AI Disease Check" }} />
      <Nav.Screen name="AgriDoctor" component={AgriDoctorScreen} options={{ title: "Agri Doctor" }} />
      <Nav.Screen name="AgriDoctorProfile" component={AgriDoctorProfileScreen} options={{ title: "Doctor Profile" }} />
      <Nav.Screen name="AgriDoctorCall" component={AgriDoctorCallScreen} options={{ title: "On call", headerShown: false }} />
      <Nav.Screen name="AgriExpertHub" component={AgriExpertHubScreen} options={{ title: "Agriculture Expert" }} />
      <Nav.Screen name="AgriDoctorRegister" component={AgriDoctorRegisterScreen} options={{ title: "Add Doctor Profile" }} />
      <Nav.Screen name="AgriDoctorEarnings" component={AgriDoctorEarningsScreen} options={{ title: "Earnings & Payouts" }} />
      <Nav.Screen name="Consultation" component={ConsultationScreen} options={{ title: "Consultation" }} />
      <Nav.Screen name="Subscription" component={SubscriptionScreen} options={{ title: "Subscription" }} />
      <Nav.Screen name="Wallet" component={WalletScreen} options={{ title: "Wallet" }} />
      <Nav.Screen name="ManagerDevices" component={ManagerDevicesScreen} options={{ title: "Manager Devices" }} />
      <Nav.Screen name="Bin" component={BinScreen} options={{ title: "Recycle Bin" }} />
      <Nav.Screen name="SyncLog" component={SyncLogScreen} options={{ title: "Sync Log" }} />
      <Nav.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <Nav.Screen name="Help" component={HelpScreen} options={{ title: "Help" }} />
      <Nav.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Nav.Screen name="BackupRestore" component={BackupRestoreScreen} options={{ title: "Backup & Restore" }} />
      <Nav.Screen name="Onboarding" component={OnboardingScreen} options={{ title: "Set Up Your Farm" }} />
      <Nav.Screen name="EstateEdit" component={EstateEditScreen} options={{ title: "Edit Farm" }} />
      <Nav.Screen name="Welcome" options={{ title: "How Chiguru Works" }}>
        {({ navigation }: any) => <WelcomeScreen onDone={() => navigation.goBack()} />}
      </Nav.Screen>
    </>
  );
}

function DashboardStack() {
  return (
    <DashboardStackNav.Navigator>
      <DashboardStackNav.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({ header: () => <AppHeader navigation={navigation} /> })}
      />
      <DashboardStackNav.Screen name="More" component={MoreScreen} options={{ title: "More" }} />
      {registerSharedScreens(DashboardStackNav)}
    </DashboardStackNav.Navigator>
  );
}

function WorkStack() {
  return (
    <WorkStackNav.Navigator>
      <WorkStackNav.Screen
        name="WorkGroupList"
        component={WorkGroupListScreen}
        options={{ title: "Work Groups", ...headerOptions }}
      />
      <WorkStackNav.Screen name="WorkGroupForm" component={WorkGroupFormScreen} options={{ title: "New Work Group" }} />
      <WorkStackNav.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={({ route }: any) => ({ title: route.params?.workGroupName ?? "Attendance" })}
      />
    </WorkStackNav.Navigator>
  );
}

function UpdatesStack() {
  return (
    <UpdatesStackNav.Navigator>
      <UpdatesStackNav.Screen
        name="DailyUpdateList"
        component={DailyUpdateListScreen}
        options={{ title: "Work Updates", ...headerOptions }}
      />
      <UpdatesStackNav.Screen name="DailyUpdateForm" component={DailyUpdateFormScreen} options={{ title: "New Update" }} />
    </UpdatesStackNav.Navigator>
  );
}

function AccountsStack() {
  return (
    <AccountsStackNav.Navigator initialRouteName="FarmAccounts" screenOptions={headerOptions}>
      {registerSharedScreens(AccountsStackNav)}
    </AccountsStackNav.Navigator>
  );
}

function SyncStack() {
  return (
    <SyncStackNav.Navigator>
      <SyncStackNav.Screen name="SyncLog" component={SyncLogScreen} options={{ title: "Sync Activity" }} />
    </SyncStackNav.Navigator>
  );
}

const TAB_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  DashboardTab: Home,
  WorkTab: UserCheck,
  UpdatesTab: Camera,
  AccountsTab: BookOpen,
  SyncTab: RefreshCw,
};

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon color={color} size={size ?? 20} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: "Home" }} />
      <Tab.Screen name="WorkTab" component={WorkStack} options={{ title: "Attendance" }} />
      <Tab.Screen name="UpdatesTab" component={UpdatesStack} options={{ title: "Updates" }} />
      <Tab.Screen name="AccountsTab" component={AccountsStack} options={{ title: "Accounts" }} />
      <Tab.Screen name="SyncTab" component={SyncStack} options={{ title: "Sync" }} />
    </Tab.Navigator>
  );
}
