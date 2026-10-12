import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEstateStore } from "../estate/store/estateStore";
import { harvestHeaderOptions } from "../../components/HarvestHeader";
import { Pill } from "../../components/harvest";
import { useCurrencyStore } from "./currency";
import { HomeScreen } from "./home/screens/HomeScreen";
import { WorkPlanScreen } from "./home/screens/WorkPlanScreen";
import { AttendanceGroupsScreen } from "./attendance/screens/AttendanceGroupsScreen";
import { CreateWorkGroupScreen } from "./attendance/screens/CreateWorkGroupScreen";
import { AttendanceWorkersScreen } from "./attendance/screens/AttendanceWorkersScreen";
import { WorkUpdateScreen } from "./work-update/screens/WorkUpdateScreen";
import { ExpenseListScreen } from "./expenses/screens/ExpenseListScreen";
import { ExpenseFormScreen } from "./expenses/screens/ExpenseFormScreen";
import { LabourRecordsScreen } from "../labour-records/screens/LabourRecordsScreen";
import { EmployeeAttendanceScreen } from "../labour-records/screens/EmployeeAttendanceScreen";

const Stack = createNativeStackNavigator();

// What someone sees while working on a farm they were invited to: the old
// Manager app's screens plus Farm Accounts' Labour Payments & Records and
// Employee Attendance. The backend
// enforces the same limits (chiguru-backend's middlewares/inviteeAccess.ts).
export function InviteeStack() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const refreshCurrency = useCurrencyStore((s) => s.refresh);

  useEffect(() => {
    refreshCurrency();
  }, [activeEstateId, refreshCurrency]);

  return (
    <Stack.Navigator screenOptions={{ ...harvestHeaderOptions, headerRight: () => <Pill text="Invited" tone="on" /> }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Chiguru", headerShown: false }} />
      <Stack.Screen name="WorkPlan" component={WorkPlanScreen} options={{ title: "Work Plan" }} />
      <Stack.Screen name="Attendance" component={AttendanceGroupsScreen} options={{ title: "Attendance" }} />
      <Stack.Screen name="CreateWorkGroup" component={CreateWorkGroupScreen} options={{ title: "New Work Group" }} />
      <Stack.Screen
        name="AttendanceWorkers"
        component={AttendanceWorkersScreen}
        options={({ route }: any) => ({ title: route.params?.workGroupName ?? "Attendance" })}
      />
      <Stack.Screen name="WorkUpdate" component={WorkUpdateScreen} options={{ title: "Work Update" }} />
      <Stack.Screen name="Expenses" component={ExpenseListScreen} options={{ title: "Expenses" }} />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "New Expense" }} />
      <Stack.Screen name="LabourRecords" component={LabourRecordsScreen} options={{ title: "Labour Payments & Records" }} />
      <Stack.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} options={{ title: "Employee Attendance" }} />
    </Stack.Navigator>
  );
}
