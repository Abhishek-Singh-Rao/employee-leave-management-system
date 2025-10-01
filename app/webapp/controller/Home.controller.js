sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
  ],
  function (Controller, JSONModel, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.company.leavemanagement.controller.Home", {
      onInit: function () {
        console.log("🏠 Home controller initialized");
        this._initializeLocalModel();

        // Wait for component model to be available before loading statistics
        this._waitForModel().then(() => {
          this._loadStatistics();
        });
      },

      _waitForModel: function () {
        return new Promise((resolve) => {
          const checkModel = () => {
            const oModel = this.getView().getModel();
            if (oModel) {
              console.log("✅ OData model is ready");
              resolve(oModel);
            } else {
              console.log("⏳ Waiting for OData model...");
              setTimeout(checkModel, 200);
            }
          };
          checkModel();
        });
      },

      _initializeLocalModel: function () {
        // Create local JSON model for view data
        const oLocalModel = new JSONModel({
          serviceList: [
            {
              name: "Employees",
              description: "Employee master data with leave balances",
              icon: "sap-icon://employee",
              route: "employeeList",
              available: true,
            },
            {
              name: "Leave Requests",
              description: "Submit and track leave applications",
              icon: "sap-icon://request",
              route: "leaveRequests",
              available: false, // Will be implemented in Phase 3
            },
            {
              name: "Leave Types",
              description: "Available leave categories and limits",
              icon: "sap-icon://list",
              route: "leaveTypes",
              available: false, // Will be implemented in Phase 3
            },
            {
              name: "Managers",
              description: "Management hierarchy for approvals",
              icon: "sap-icon://manager",
              route: "managers",
              available: false, // Will be implemented in Phase 4
            },
            {
              name: "Approvals",
              description: "Decision history and workflow",
              icon: "sap-icon://approve",
              route: "approvals",
              available: false, // Will be implemented in Phase 4
            },
          ],
          stats: {
            employeeCount: 0,
            pendingRequests: 0,
            approvedToday: 0,
            isLoading: true,
          },
          testResults: {
            visible: false,
            data: [],
            title: "",
          },
          quickActions: [
            {
              title: "Manage Employees",
              description: "View, add, edit, and delete employees",
              icon: "sap-icon://employee",
              route: "employeeList",
              type: "Emphasized",
              available: true,
            },
            {
              title: "New Leave Request",
              description: "Submit a new leave application",
              icon: "sap-icon://add",
              route: "leaveRequests",
              type: "Default",
              available: false,
            },
            {
              title: "Pending Approvals",
              description: "Review and approve leave requests",
              icon: "sap-icon://approve",
              route: "approvals",
              type: "Default",
              available: false,
            },
          ],
        });

        this.getView().setModel(oLocalModel, "local");
      },

      _loadStatistics: function () {
        const oModel = this.getView().getModel();
        const oLocalModel = this.getView().getModel("local");

        if (!oModel) {
          console.error("❌ Model not available for statistics");
          return;
        }

        // Set loading state
        oLocalModel.setProperty("/stats/isLoading", true);

        Promise.all([
          this._loadEmployeeCount(oModel),
          this._loadPendingRequestsCount(oModel),
          this._loadApprovedTodayCount(oModel),
        ])
          .then(() => {
            oLocalModel.setProperty("/stats/isLoading", false);
            console.log("📊 All statistics loaded successfully");
          })
          .catch((error) => {
            console.error("❌ Failed to load statistics:", error);
            oLocalModel.setProperty("/stats/isLoading", false);
          });
      },

      _loadEmployeeCount: function (oModel) {
        return oModel
          .bindList("/Employees")
          .requestContexts(0, 1000)
          .then((aContexts) => {
            const oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/stats/employeeCount", aContexts.length);
            console.log(`📊 Loaded ${aContexts.length} employees for stats`);
          })
          .catch((error) => {
            console.error("❌ Failed to load employee count:", error);
            throw error;
          });
      },

      _loadPendingRequestsCount: function (oModel) {
        return oModel
          .bindList("/LeaveRequests")
          .requestContexts(0, 1000)
          .then((aContexts) => {
            const pendingCount = aContexts.filter(
              (ctx) => ctx.getObject().status === "Pending"
            ).length;

            const approvedToday = aContexts.filter((ctx) => {
              const request = ctx.getObject();
              if (request.status !== "Approved") return false;

              // Check if approved today (simplified - you might want to check Approval entity)
              const today = new Date().toISOString().split("T")[0];
              return request.modifiedAt && request.modifiedAt.startsWith(today);
            }).length;

            const oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/stats/pendingRequests", pendingCount);
            oLocalModel.setProperty("/stats/approvedToday", approvedToday);

            console.log(
              `📊 Found ${pendingCount} pending requests, ${approvedToday} approved today`
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load request counts:", error);
            throw error;
          });
      },

      _loadApprovedTodayCount: function (oModel) {
        // This could be enhanced to check the Approvals entity for today's approvals
        return Promise.resolve(); // Already handled in _loadPendingRequestsCount
      },

      // Navigation handlers
      onServicePress: function (oEvent) {
        const oBindingContext = oEvent.getSource().getBindingContext("local");
        const oService = oBindingContext.getObject();

        console.log("🔗 Service pressed:", oService.name);

        if (oService.available && oService.route) {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo(oService.route);
          MessageToast.show(`Navigating to ${oService.name}...`);
        } else {
          MessageToast.show(
            `${oService.name} - Coming in ${
              oService.route === "leaveRequests" ||
              oService.route === "leaveTypes"
                ? "Phase 3"
                : "Phase 4"
            }`
          );
        }
      },

      onQuickActionPress: function (oEvent) {
        // Get the action from custom data or binding context
        const oButton = oEvent.getSource();
        const sRoute = oButton.data("route");
        const bAvailable = oButton.data("available") === "true";

        if (bAvailable && sRoute) {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo(sRoute);
        } else {
          MessageToast.show("Feature coming in future phases");
        }
      },

      // Enhanced test button handlers with result display
      onLoadEmployees: function () {
        console.log("🔄 Testing employee data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        oModel
          .bindList("/Employees")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const employees = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Employees loaded:", employees);

            this._displayTestResults("Employees", employees);
            MessageToast.show(
              `✅ Loaded ${employees.length} employees successfully!`
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load employees:", error);
            MessageToast.show("❌ Failed to load employees");
          });
      },

      onLoadLeaveRequests: function () {
        console.log("🔄 Testing leave requests data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        oModel
          .bindList("/LeaveRequests")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const requests = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Leave requests loaded:", requests);

            this._displayTestResults("Leave Requests", requests);
            MessageToast.show(
              `✅ Loaded ${requests.length} leave requests successfully!`
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load leave requests:", error);
            MessageToast.show("❌ Failed to load leave requests");
          });
      },

      onLoadLeaveTypes: function () {
        console.log("🔄 Testing leave types data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        oModel
          .bindList("/LeaveTypes")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const leaveTypes = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Leave types loaded:", leaveTypes);

            this._displayTestResults("Leave Types", leaveTypes);
            MessageToast.show(
              `✅ Loaded ${leaveTypes.length} leave types successfully!`
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load leave types:", error);
            MessageToast.show("❌ Failed to load leave types");
          });
      },

      _displayTestResults: function (sTitle, aData) {
        const oLocalModel = this.getView().getModel("local");

        // Format data for display
        const aFormattedData = aData.slice(0, 5).map((item, index) => {
          return {
            index: index + 1,
            data: JSON.stringify(item, null, 2),
          };
        });

        oLocalModel.setProperty("/testResults", {
          visible: true,
          title: `${sTitle} (Showing first 5 records)`,
          data: aFormattedData,
          totalCount: aData.length,
        });
      },

      onRefreshStats: function () {
        console.log("🔄 Refreshing statistics...");
        this._loadStatistics();
        MessageToast.show("📊 Statistics refreshed");
      },

      onClearResults: function () {
        const oLocalModel = this.getView().getModel("local");
        oLocalModel.setProperty("/testResults/visible", false);
      },

      onTestConnectivity: function () {
        console.log("🔄 Testing backend connectivity...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        // Test with a simple metadata request
        try {
          oModel
            .getMetaModel()
            .requestObject("/$EntityContainer")
            .then((oMetadata) => {
              console.log("✅ Metadata loaded:", oMetadata);
              MessageToast.show("✅ Backend connectivity: SUCCESS");

              // Display metadata info
              this._displayTestResults("Service Metadata", [oMetadata]);
            })
            .catch((error) => {
              console.error("❌ Connectivity test failed:", error);
              MessageToast.show("❌ Backend connectivity: FAILED");
            });
        } catch (error) {
          console.error("❌ Connectivity test error:", error);
          MessageToast.show("❌ Connectivity test failed");
        }
      },

      // Quick navigation methods
      onManageEmployees: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("employeeList");
      },
    });
  }
);
