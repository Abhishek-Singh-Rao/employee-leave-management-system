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
        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const shortDate = today.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const oLocalModel = new JSONModel({
          currentDate: formattedDate,
          todayDate: shortDate,
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
              available: true,
            },
            {
              name: "Leave Types",
              description: "Available leave categories and limits",
              icon: "sap-icon://list",
              route: "leaveTypes",
              available: true,
            },
            {
              name: "Managers",
              description: "Management hierarchy for approvals",
              icon: "sap-icon://manager",
              route: "managers",
              available: true,
            },
            {
              name: "Approvals",
              description: "Decision history and workflow",
              icon: "sap-icon://approve",
              route: "approvals",
              available: true,
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
            MessageToast.show("📊 Dashboard refreshed successfully!", {
              duration: 2000,
            });
          })
          .catch((error) => {
            console.error("❌ Failed to load statistics:", error);
            oLocalModel.setProperty("/stats/isLoading", false);
            MessageToast.show("⚠️ Failed to load some statistics");
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

              // Check if approved today
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
        // Already handled in _loadPendingRequestsCount
        return Promise.resolve();
      },

      // Navigation handlers - Enhanced for GenericTile
      onServicePress: function (oEvent) {
        const oTile = oEvent.getSource();
        const sRoute = oTile.data("route");
        const bAvailable = oTile.data("available") === "true";
        const sServiceName = oTile.getHeader();

        console.log(
          "🔗 Service tile pressed:",
          sServiceName,
          "Route:",
          sRoute,
          "Available:",
          bAvailable
        );

        if (bAvailable && sRoute) {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo(sRoute);
          MessageToast.show(`✨ Navigating to ${sServiceName}...`, {
            duration: 2000,
          });
        } else {
          MessageToast.show(`🚀 ${sServiceName} - Coming in future phases!`, {
            duration: 3000,
          });
        }
      },

      onQuickActionPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const sRoute = oButton.data("route");
        const bAvailable = oButton.data("available") === "true";

        if (bAvailable && sRoute) {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo(sRoute);
          MessageToast.show("✨ Navigating...", { duration: 2000 });
        } else {
          MessageToast.show("🚀 Feature coming in future phases!", {
            duration: 3000,
          });
        }
      },

      // Enhanced test button handlers
      onLoadEmployees: function () {
        console.log("🔄 Testing employee data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        // Show loading toast
        MessageToast.show("⏳ Loading employees...", { duration: 1500 });

        oModel
          .bindList("/Employees")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const employees = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Employees loaded:", employees);

            this._displayTestResults("Employees", employees);
            MessageToast.show(
              `✅ Loaded ${employees.length} employees successfully!`,
              { duration: 3000 }
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load employees:", error);
            MessageToast.show("❌ Failed to load employees", {
              duration: 3000,
            });
          });
      },

      onLoadLeaveRequests: function () {
        console.log("🔄 Testing leave requests data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        MessageToast.show("⏳ Loading leave requests...", { duration: 1500 });

        oModel
          .bindList("/LeaveRequests")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const requests = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Leave requests loaded:", requests);

            this._displayTestResults("Leave Requests", requests);
            MessageToast.show(
              `✅ Loaded ${requests.length} leave requests successfully!`,
              { duration: 3000 }
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load leave requests:", error);
            MessageToast.show("❌ Failed to load leave requests", {
              duration: 3000,
            });
          });
      },

      onLoadLeaveTypes: function () {
        console.log("🔄 Testing leave types data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        MessageToast.show("⏳ Loading leave types...", { duration: 1500 });

        oModel
          .bindList("/LeaveTypes")
          .requestContexts(0, 10)
          .then((aContexts) => {
            const leaveTypes = aContexts.map((ctx) => ctx.getObject());
            console.log("✅ Leave types loaded:", leaveTypes);

            this._displayTestResults("Leave Types", leaveTypes);
            MessageToast.show(
              `✅ Loaded ${leaveTypes.length} leave types successfully!`,
              { duration: 3000 }
            );
          })
          .catch((error) => {
            console.error("❌ Failed to load leave types:", error);
            MessageToast.show("❌ Failed to load leave types", {
              duration: 3000,
            });
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

        // Smooth scroll to results
        setTimeout(() => {
          const oPage = this.getView().byId("page");
          const oResultsCard = this.byId("testResultsCard");

          if (oPage && oResultsCard) {
            oResultsCard.getDomRef().scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 200);
      },

      onRefreshStats: function () {
        console.log("🔄 Refreshing statistics...");
        MessageToast.show("🔄 Refreshing dashboard...", { duration: 1500 });
        this._loadStatistics();
      },

      onClearResults: function () {
        const oLocalModel = this.getView().getModel("local");
        oLocalModel.setProperty("/testResults/visible", false);
        MessageToast.show("✨ Results cleared", { duration: 2000 });
      },

      onTestConnectivity: function () {
        console.log("🔄 Testing backend connectivity...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

        MessageToast.show("⏳ Testing connectivity...", { duration: 1500 });

        // Test with a simple metadata request
        try {
          oModel
            .getMetaModel()
            .requestObject("/$EntityContainer")
            .then((oMetadata) => {
              console.log("✅ Metadata loaded:", oMetadata);
              MessageToast.show("✅ Backend connectivity: SUCCESS", {
                duration: 3000,
              });

              // Display metadata info
              this._displayTestResults("Service Metadata", [oMetadata]);
            })
            .catch((error) => {
              console.error("❌ Connectivity test failed:", error);
              MessageToast.show("❌ Backend connectivity: FAILED", {
                duration: 3000,
              });
            });
        } catch (error) {
          console.error("❌ Connectivity test error:", error);
          MessageToast.show("❌ Connectivity test failed", { duration: 3000 });
        }
      },

      // Quick navigation methods
      onManageEmployees: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("employeeList");
        MessageToast.show("✨ Navigating to Employee Management...", {
          duration: 2000,
        });
      },
    });
  }
);
