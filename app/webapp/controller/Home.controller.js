sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
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
            totalCount: 0,
          },
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

      // Navigation handlers
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

      // Dialog handlers
      onShowNotifications: function () {
        MessageBox.information(
          "You have 3 pending notifications:\n\n" +
            "• New leave request from John Doe\n" +
            "• Leave approved for Jane Smith\n" +
            "• System maintenance scheduled",
          {
            title: "Notifications",
            styleClass: "sapUiSizeCompact",
          }
        );
      },

      onShowSystemHealth: function () {
        if (!this._systemHealthDialog) {
          this._createSystemHealthDialog();
        }
        this._systemHealthDialog.open();
      },

      _createSystemHealthDialog: function () {
        this._systemHealthDialog = new sap.m.Dialog({
          title: "System Health Monitor",
          icon: "sap-icon://sys-monitor",
          contentWidth: "600px",
          resizable: true,
          draggable: true,
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.MessageStrip({
                  text: "All systems are operational. Real-time monitoring dashboard.",
                  type: "Success",
                  showIcon: true,
                  class: "sapUiSmallMarginBottom",
                }),

                // Backend Status
                new sap.m.HBox({
                  alignItems: "Center",
                  justifyContent: "SpaceBetween",
                  class: "sapUiSmallMarginBottom",
                  items: [
                    new sap.m.HBox({
                      alignItems: "Center",
                      items: [
                        new sap.ui.core.Icon({
                          src: "sap-icon://connected",
                          size: "1.5rem",
                          color: "#28a745",
                          class: "sapUiSmallMarginEnd",
                        }),
                        new sap.m.VBox({
                          items: [
                            new sap.m.Label({
                              text: "Backend Connection",
                              design: "Bold",
                            }),
                            new sap.m.Label({
                              text: "CAP Service Layer",
                            }),
                          ],
                        }),
                      ],
                    }),
                    new sap.m.ObjectStatus({
                      text: "Online",
                      state: "Success",
                      icon: "sap-icon://status-positive",
                    }),
                  ],
                }),

                new sap.m.ProgressIndicator({
                  percentValue: 100,
                  displayValue: "100% Available",
                  state: "Success",
                  class: "sapUiSmallMarginBottom",
                }),

                // Database Status
                new sap.m.HBox({
                  alignItems: "Center",
                  justifyContent: "SpaceBetween",
                  class: "sapUiSmallMarginBottom sapUiSmallMarginTop",
                  items: [
                    new sap.m.HBox({
                      alignItems: "Center",
                      items: [
                        new sap.ui.core.Icon({
                          src: "sap-icon://database",
                          size: "1.5rem",
                          color: "#0366d6",
                          class: "sapUiSmallMarginEnd",
                        }),
                        new sap.m.VBox({
                          items: [
                            new sap.m.Label({
                              text: "Database",
                              design: "Bold",
                            }),
                            new sap.m.Label({
                              text: "SQLite Active",
                            }),
                          ],
                        }),
                      ],
                    }),
                    new sap.m.ObjectStatus({
                      text: "Operational",
                      state: "Success",
                      icon: "sap-icon://status-positive",
                    }),
                  ],
                }),

                new sap.m.ProgressIndicator({
                  percentValue: 100,
                  displayValue: "All Tables Ready",
                  state: "Success",
                  class: "sapUiSmallMarginBottom",
                }),

                // Service Endpoint
                new sap.m.VBox({
                  class: "sapUiSmallMarginTop",
                  items: [
                    new sap.m.Label({
                      text: "Service Endpoint",
                      design: "Bold",
                      class: "sapUiTinyMarginBottom",
                    }),
                    new sap.m.HBox({
                      alignItems: "Center",
                      items: [
                        new sap.ui.core.Icon({
                          src: "sap-icon://chain-link",
                          size: "1rem",
                          class: "sapUiTinyMarginEnd",
                        }),
                        new sap.m.Link({
                          text: "http://localhost:4004/leave/",
                          href: "http://localhost:4004/leave/",
                          target: "_blank",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }).addStyleClass("sapUiContentPadding"),
          ],
          endButton: new sap.m.Button({
            text: "Close",
            press: () => {
              this._systemHealthDialog.close();
            },
          }),
        });

        this.getView().addDependent(this._systemHealthDialog);
      },

      onShowGettingStarted: function () {
        if (!this._gettingStartedDialog) {
          this._createGettingStartedDialog();
        }
        this._gettingStartedDialog.open();
      },

      _createGettingStartedDialog: function () {
        this._gettingStartedDialog = new sap.m.Dialog({
          title: "Getting Started Guide",
          icon: "sap-icon://learning-assistant",
          contentWidth: "600px",
          resizable: true,
          draggable: true,
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.MessageStrip({
                  text: "Welcome to the Employee Leave Management System! Follow these steps to get started.",
                  type: "Success",
                  showIcon: true,
                  class: "sapUiSmallMarginBottom",
                }),
                new sap.m.VBox({
                  items: [
                    this._createGuideStep(
                      "1",
                      "Explore Services",
                      "Click on service tiles to navigate to different modules and explore system features.",
                      "Accent1"
                    ),
                    this._createGuideStep(
                      "2",
                      "Monitor Statistics",
                      "The statistics cards at the top show real-time data from your leave management system.",
                      "Accent4"
                    ),
                    this._createGuideStep(
                      "3",
                      "Manage Employees",
                      "Employee management interface is ready! Start adding and managing your workforce.",
                      "Accent3"
                    ),
                    this._createGuideStep(
                      "4",
                      "Check System Health",
                      "Click the monitor icon in the header to view system health and backend status.",
                      "Accent6"
                    ),
                  ],
                  class: "sapUiSmallMargin",
                }),
              ],
            }).addStyleClass("sapUiContentPadding"),
          ],
          beginButton: new sap.m.Button({
            text: "Got It!",
            type: "Emphasized",
            press: () => {
              this._gettingStartedDialog.close();
            },
          }),
          endButton: new sap.m.Button({
            text: "Close",
            press: () => {
              this._gettingStartedDialog.close();
            },
          }),
        });

        this.getView().addDependent(this._gettingStartedDialog);
      },

      _createGuideStep: function (number, title, description, color) {
        return new sap.m.HBox({
          alignItems: "Start",
          class: "sapUiSmallMarginBottom",
          items: [
            new sap.m.Avatar({
              initials: number,
              displaySize: "M",
              backgroundColor: color,
              class: "sapUiSmallMarginEnd",
            }),
            new sap.m.VBox({
              items: [
                new sap.m.Title({
                  text: title,
                  level: "H5",
                }),
                new sap.m.Text({
                  text: description,
                  class: "sapUiTinyMarginTop",
                }),
              ],
            }),
          ],
        });
      },

      onShowDataTesting: function () {
        if (!this._dataTestingDialog) {
          this._createDataTestingDialog();
        }
        this._dataTestingDialog.open();
      },

      _createDataTestingDialog: function () {
        this._dataTestingDialog = new sap.m.Dialog({
          title: "Data Testing",
          icon: "sap-icon://stethoscope",
          contentWidth: "500px",
          resizable: true,
          draggable: true,
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.MessageStrip({
                  text: "Test data loading from backend services",
                  type: "Information",
                  showIcon: true,
                  class: "sapUiSmallMarginBottom",
                }),
                new sap.m.Button({
                  text: "Load Employees",
                  icon: "sap-icon://employee",
                  type: "Emphasized",
                  width: "100%",
                  press: this.onLoadEmployees.bind(this),
                  class: "sapUiTinyMarginBottom",
                }),
                new sap.m.Button({
                  text: "Load Leave Requests",
                  icon: "sap-icon://request",
                  type: "Accept",
                  width: "100%",
                  press: this.onLoadLeaveRequests.bind(this),
                  class: "sapUiTinyMarginBottom",
                }),
                new sap.m.Button({
                  text: "Load Leave Types",
                  icon: "sap-icon://list",
                  type: "Attention",
                  width: "100%",
                  press: this.onLoadLeaveTypes.bind(this),
                }),
              ],
            }).addStyleClass("sapUiContentPadding"),
          ],
          endButton: new sap.m.Button({
            text: "Close",
            press: () => {
              this._dataTestingDialog.close();
            },
          }),
        });

        this.getView().addDependent(this._dataTestingDialog);
      },

      // Test button handlers
      onLoadEmployees: function () {
        console.log("🔄 Testing employee data load...");
        const oModel = this.getView().getModel();

        if (!oModel) {
          MessageToast.show("❌ No model available");
          return;
        }

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

            if (this._dataTestingDialog) {
              this._dataTestingDialog.close();
            }
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

            if (this._dataTestingDialog) {
              this._dataTestingDialog.close();
            }
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

            if (this._dataTestingDialog) {
              this._dataTestingDialog.close();
            }
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
          const oResultsCard = document.querySelector(".resultsDisplayCard");
          if (oResultsCard) {
            oResultsCard.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 200);
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
