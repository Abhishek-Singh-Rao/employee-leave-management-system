sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.company.leavemanagement.controller.Reports", {
      onInit: function () {
        console.log("📊 Reports controller initialized");
        this._initializeLocalModel();

        const oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("reports")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        console.log("📍 Reports route matched");
        this._loadAllReports();
      },

      _initializeLocalModel: function () {
        const today = new Date();
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

        const oLocalModel = new JSONModel({
          selectedPeriod: "thisMonth",
          dateRange: {
            start: firstDayOfMonth,
            end: lastDayOfMonth,
            label: this._formatDateRange(firstDayOfMonth, lastDayOfMonth),
          },
          metrics: {
            totalEmployees: 0,
            totalRequests: 0,
            approvalRate: 0,
            pendingRequests: 0,
          },
          statusSummary: [],
          leaveTypeUtilization: [],
          employeeBalances: [],
          managerSummary: [],
          monthlyTrend: [],
          auditTrail: [],
          summary: {
            totalDaysTaken: 0,
            avgLeaveBalance: 0,
            lowBalanceCount: 0,
            mostUsedLeaveType: "N/A",
          },
          isLoading: false,
        });

        this.getView().setModel(oLocalModel, "local");
      },

      _loadAllReports: function () {
        console.log("📊 Loading all reports...");
        const oLocalModel = this.getView().getModel("local");
        oLocalModel.setProperty("/isLoading", true);

        const oModel = this.getView().getModel();
        if (!oModel) {
          setTimeout(() => this._loadAllReports(), 500);
          return;
        }

        Promise.all([
          this._loadEmployees(oModel),
          this._loadLeaveRequests(oModel),
          this._loadLeaveTypes(oModel),
          this._loadManagers(oModel),
          this._loadApprovals(oModel),
        ])
          .then(([employees, requests, leaveTypes, managers, approvals]) => {
            console.log("✅ All data loaded successfully");

            // Calculate all reports
            this._calculateMetrics(employees, requests);
            this._calculateStatusSummary(requests);
            this._calculateLeaveTypeUtilization(requests, leaveTypes);
            this._calculateEmployeeBalances(employees, requests);
            this._calculateManagerSummary(managers, requests, approvals);
            this._calculateMonthlyTrend(requests);
            this._buildAuditTrail(requests, approvals);
            this._calculateSummary(employees, requests, leaveTypes);

            oLocalModel.setProperty("/isLoading", false);
            MessageToast.show("Reports loaded successfully");
          })
          .catch((error) => {
            console.error("❌ Failed to load reports:", error);
            oLocalModel.setProperty("/isLoading", false);
            MessageBox.error("Failed to load report data: " + error.message);
          });
      },

      _loadEmployees: function (oModel) {
        return oModel
          .bindList("/Employees", undefined, undefined, undefined, {
            $expand: "manager",
          })
          .requestContexts(0, 1000)
          .then((contexts) => contexts.map((ctx) => ctx.getObject()));
      },

      _loadLeaveRequests: function (oModel) {
        return oModel
          .bindList("/LeaveRequests", undefined, undefined, undefined, {
            $expand: "employee,leaveType",
          })
          .requestContexts(0, 1000)
          .then((contexts) => contexts.map((ctx) => ctx.getObject()));
      },

      _loadLeaveTypes: function (oModel) {
        return oModel
          .bindList("/LeaveTypes")
          .requestContexts(0, 100)
          .then((contexts) => contexts.map((ctx) => ctx.getObject()));
      },

      _loadManagers: function (oModel) {
        return oModel
          .bindList("/Managers")
          .requestContexts(0, 100)
          .then((contexts) => contexts.map((ctx) => ctx.getObject()));
      },

      _loadApprovals: function (oModel) {
        return oModel
          .bindList("/Approvals", undefined, undefined, undefined, {
            $expand: "employee,manager,request",
          })
          .requestContexts(0, 1000)
          .then((contexts) => contexts.map((ctx) => ctx.getObject()));
      },

      _calculateMetrics: function (employees, requests) {
        const oLocalModel = this.getView().getModel("local");

        const totalRequests = requests.length;
        const approvedRequests = requests.filter(
          (r) => r.status === "Approved"
        ).length;
        const pendingRequests = requests.filter(
          (r) => r.status === "Pending"
        ).length;
        const approvalRate =
          totalRequests > 0
            ? Math.round((approvedRequests / totalRequests) * 100)
            : 0;

        oLocalModel.setProperty("/metrics", {
          totalEmployees: employees.length,
          totalRequests: totalRequests,
          approvalRate: approvalRate,
          pendingRequests: pendingRequests,
        });

        console.log("✅ Metrics calculated");
      },

      _calculateStatusSummary: function (requests) {
        const oLocalModel = this.getView().getModel("local");

        const total = requests.length || 1;
        const approved = requests.filter((r) => r.status === "Approved").length;
        const pending = requests.filter((r) => r.status === "Pending").length;
        const rejected = requests.filter((r) => r.status === "Rejected").length;

        const summary = [
          {
            status: "Approved",
            count: approved,
            percentage: Math.round((approved / total) * 100),
            state: "Success",
            icon: "sap-icon://accept",
          },
          {
            status: "Pending",
            count: pending,
            percentage: Math.round((pending / total) * 100),
            state: "Warning",
            icon: "sap-icon://pending",
          },
          {
            status: "Rejected",
            count: rejected,
            percentage: Math.round((rejected / total) * 100),
            state: "Error",
            icon: "sap-icon://decline",
          },
        ];

        oLocalModel.setProperty("/statusSummary", summary);
        console.log("✅ Status summary calculated");
      },

      _calculateLeaveTypeUtilization: function (requests, leaveTypes) {
        const oLocalModel = this.getView().getModel("local");
        const utilization = {};

        // Count requests and days by leave type
        requests.forEach((request) => {
          const typeCode = request.leaveTypeCode || "Unknown";
          if (!utilization[typeCode]) {
            const leaveType = leaveTypes.find((lt) => lt.code === typeCode);
            utilization[typeCode] = {
              leaveTypeCode: typeCode,
              leaveTypeName: leaveType ? leaveType.name : "Unknown",
              requestCount: 0,
              totalDays: 0,
            };
          }
          utilization[typeCode].requestCount++;
          utilization[typeCode].totalDays += request.days || 0;
        });

        // Calculate percentages
        const total = requests.length || 1;
        const utilizationArray = Object.values(utilization)
          .map((item) => {
            return {
              ...item,
              percentage: Math.round((item.requestCount / total) * 100),
            };
          })
          .sort((a, b) => b.requestCount - a.requestCount);

        oLocalModel.setProperty("/leaveTypeUtilization", utilizationArray);
        console.log("✅ Leave type utilization calculated");
      },

      _calculateEmployeeBalances: function (employees, requests) {
        const oLocalModel = this.getView().getModel("local");

        const balances = employees
          .map((employee) => {
            const employeeRequests = requests.filter(
              (r) => r.employeeId === employee.empId
            );

            // Determine balance state
            let balanceState = "Success";
            if (employee.leaveBalance < 5) balanceState = "Error";
            else if (employee.leaveBalance < 10) balanceState = "Warning";

            return {
              empId: employee.empId,
              name: employee.name || "Unknown",
              leaveBalance: employee.leaveBalance || 0,
              requestCount: employeeRequests.length,
              balanceState: balanceState,
            };
          })
          .sort((a, b) => a.leaveBalance - b.leaveBalance);

        oLocalModel.setProperty("/employeeBalances", balances);
        console.log("✅ Employee balances calculated");
      },

      _calculateManagerSummary: function (managers, requests, approvals) {
        const oLocalModel = this.getView().getModel("local");

        const summary = managers
          .map((manager) => {
            const managerApprovals = approvals.filter(
              (a) => a.managerName === manager.name
            );

            const totalProcessed = managerApprovals.length;
            const approved = managerApprovals.filter(
              (a) => a.decision === "Approved"
            ).length;
            const rejected = managerApprovals.filter(
              (a) => a.decision === "Rejected"
            ).length;

            // Get pending requests for this manager's team
            const teamRequests = requests.filter(
              (r) =>
                r.employee?.managerId === manager.ID && r.status === "Pending"
            );

            const approvalRate =
              totalProcessed > 0
                ? Math.round((approved / totalProcessed) * 100)
                : 0;

            return {
              managerName: manager.name,
              totalProcessed: totalProcessed,
              approved: approved,
              rejected: rejected,
              pending: teamRequests.length,
              approvalRate: approvalRate,
            };
          })
          .sort((a, b) => b.totalProcessed - a.totalProcessed);

        oLocalModel.setProperty("/managerSummary", summary);
        console.log("✅ Manager summary calculated");
      },

      _calculateMonthlyTrend: function (requests) {
        const oLocalModel = this.getView().getModel("local");
        const monthlyData = {};

        // Group requests by month
        requests.forEach((request) => {
          if (request.createdAt) {
            const date = new Date(request.createdAt);
            const monthKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
            const monthLabel = date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthLabel,
                totalRequests: 0,
                approved: 0,
                rejected: 0,
                pending: 0,
              };
            }
            monthlyData[monthKey].totalRequests++;

            if (request.status === "Approved") monthlyData[monthKey].approved++;
            else if (request.status === "Rejected")
              monthlyData[monthKey].rejected++;
            else if (request.status === "Pending")
              monthlyData[monthKey].pending++;
          }
        });

        // Convert to array and calculate approval rates
        const trendData = Object.values(monthlyData)
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6) // Last 6 months
          .map((item) => {
            const approvalRate =
              item.totalRequests > 0
                ? Math.round((item.approved / item.totalRequests) * 100)
                : 0;
            return { ...item, approvalRate };
          });

        oLocalModel.setProperty("/monthlyTrend", trendData);
        console.log("✅ Monthly trend calculated");
      },

      _buildAuditTrail: function (requests, approvals) {
        const oLocalModel = this.getView().getModel("local");
        const trail = [];

        // Add leave request submissions
        requests.forEach((request) => {
          trail.push({
            timestamp: request.createdAt,
            employeeName: request.employee?.name || "Unknown",
            leaveType: request.leaveType?.name || "Unknown",
            days: request.days,
            action: "Request Submitted",
            processedBy: "Employee",
            status: request.status,
            statusState:
              request.status === "Approved"
                ? "Success"
                : request.status === "Rejected"
                ? "Error"
                : "Warning",
          });
        });

        // Add approvals/rejections
        approvals.forEach((approval) => {
          trail.push({
            timestamp: approval.createdAt,
            employeeName: approval.employee?.name || "Unknown",
            leaveType: approval.request?.leaveType?.name || "Unknown",
            days: approval.request?.days || 0,
            action:
              approval.decision === "Approved"
                ? "Request Approved"
                : "Request Rejected",
            processedBy: approval.managerName || "Unknown Manager",
            status: approval.decision,
            statusState: approval.decision === "Approved" ? "Success" : "Error",
          });
        });

        // Sort by timestamp (most recent first)
        trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        oLocalModel.setProperty("/auditTrail", trail.slice(0, 50)); // Last 50 entries
        console.log("✅ Audit trail built");
      },

      _calculateSummary: function (employees, requests, leaveTypes) {
        const oLocalModel = this.getView().getModel("local");

        // Total days taken (approved requests only)
        const totalDaysTaken = requests
          .filter((r) => r.status === "Approved")
          .reduce((sum, r) => sum + (r.days || 0), 0);

        // Average leave balance
        const totalBalance = employees.reduce(
          (sum, e) => sum + (e.leaveBalance || 0),
          0
        );
        const avgLeaveBalance =
          employees.length > 0
            ? Math.round(totalBalance / employees.length)
            : 0;

        // Low balance count
        const lowBalanceCount = employees.filter(
          (e) => (e.leaveBalance || 0) < 5
        ).length;

        // Most used leave type
        const typeUsage = {};
        requests.forEach((r) => {
          const typeCode = r.leaveTypeCode || "Unknown";
          typeUsage[typeCode] = (typeUsage[typeCode] || 0) + 1;
        });

        let mostUsedType = "N/A";
        let maxCount = 0;
        Object.keys(typeUsage).forEach((typeCode) => {
          if (typeUsage[typeCode] > maxCount) {
            maxCount = typeUsage[typeCode];
            const leaveType = leaveTypes.find((lt) => lt.code === typeCode);
            mostUsedType = leaveType ? leaveType.name : typeCode;
          }
        });

        oLocalModel.setProperty("/summary", {
          totalDaysTaken: totalDaysTaken,
          avgLeaveBalance: avgLeaveBalance,
          lowBalanceCount: lowBalanceCount,
          mostUsedLeaveType: mostUsedType,
        });

        console.log("✅ Summary calculated");
      },

      // Navigation
      onNavBack: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("home");
      },

      // Period Selection
      onPeriodChange: function (oEvent) {
        const sSelectedKey = oEvent.getParameter("item").getKey();
        console.log("📅 Period changed to:", sSelectedKey);

        const oLocalModel = this.getView().getModel("local");
        const today = new Date();
        let startDate, endDate;

        switch (sSelectedKey) {
          case "thisMonth":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
          case "lastMonth":
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
          case "last3Months":
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
          case "thisYear":
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
          default:
            return;
        }

        oLocalModel.setProperty("/dateRange", {
          start: startDate,
          end: endDate,
          label: this._formatDateRange(startDate, endDate),
        });

        oLocalModel.setProperty("/selectedPeriod", sSelectedKey);
        this._loadAllReports();
      },

      // Refresh
      onRefresh: function () {
        console.log("🔄 Refreshing reports...");
        MessageToast.show("Refreshing reports...");
        this._loadAllReports();
      },

      // Export Functions
      onExportAll: function () {
        MessageBox.confirm("Export all reports to CSV files?", {
          title: "Export All Reports",
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.OK) {
              this._exportAllReports();
            }
          },
        });
      },

      _exportAllReports: function () {
        console.log("📥 Exporting all reports...");

        this.onExportLeaveTypeReport();
        setTimeout(() => this.onExportEmployeeReport(), 300);
        setTimeout(() => this.onExportManagerReport(), 600);
        setTimeout(() => this.onExportAuditTrail(), 900);

        MessageToast.show("All reports exported successfully!");
      },

      onExportLeaveTypeReport: function () {
        const oLocalModel = this.getView().getModel("local");
        const data = oLocalModel.getProperty("/leaveTypeUtilization");

        let csv = "Leave Type,Request Count,Total Days Used,Percentage\n";

        data.forEach((item) => {
          csv += `${item.leaveTypeName},${item.requestCount},${item.totalDays},${item.percentage}%\n`;
        });

        this._downloadCSV(csv, "Leave_Type_Utilization_Report");
        MessageToast.show("Leave type report exported");
      },

      onExportEmployeeReport: function () {
        const oLocalModel = this.getView().getModel("local");
        const data = oLocalModel.getProperty("/employeeBalances");

        let csv = "Employee ID,Name,Leave Balance,Request Count,Status\n";

        data.forEach((item) => {
          csv += `${item.empId},${item.name},${item.leaveBalance},${item.requestCount},${item.balanceState}\n`;
        });

        this._downloadCSV(csv, "Employee_Leave_Balance_Report");
        MessageToast.show("Employee report exported");
      },

      onExportManagerReport: function () {
        const oLocalModel = this.getView().getModel("local");
        const data = oLocalModel.getProperty("/managerSummary");

        let csv =
          "Manager Name,Total Processed,Approved,Rejected,Pending,Approval Rate\n";

        data.forEach((item) => {
          csv += `${item.managerName},${item.totalProcessed},${item.approved},${item.rejected},${item.pending},${item.approvalRate}%\n`;
        });

        this._downloadCSV(csv, "Manager_Approval_Summary_Report");
        MessageToast.show("Manager report exported");
      },

      onExportAuditTrail: function () {
        const oLocalModel = this.getView().getModel("local");
        const data = oLocalModel.getProperty("/auditTrail");

        let csv = "Date,Employee,Leave Type,Days,Action,Processed By,Status\n";

        data.forEach((item) => {
          const date = this.formatDate(item.timestamp);
          csv += `${date},${item.employeeName},${item.leaveType},${item.days},${item.action},${item.processedBy},${item.status}\n`;
        });

        this._downloadCSV(csv, "Leave_Transaction_Audit_Trail");
        MessageToast.show("Audit trail exported");
      },

      _downloadCSV: function (csvContent, filename) {
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },

      // Formatters
      formatDate: function (sDate) {
        if (!sDate) return "";
        const oDate = new Date(sDate);
        return oDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },

      _formatDateRange: function (startDate, endDate) {
        const options = { month: "short", day: "numeric", year: "numeric" };
        return `${startDate.toLocaleDateString(
          "en-US",
          options
        )} - ${endDate.toLocaleDateString("en-US", options)}`;
      },
    });
  }
);
