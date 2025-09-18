sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/company/leavemanagement/model/formatter",
    "sap/m/MessageToast",
  ],
  function (Controller, JSONModel, formatter, MessageToast) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.Dashboard",
      {
        formatter: formatter,

        onInit: function () {
          this._initializeModels();
          this._loadDashboardData();
        },

        _initializeModels: function () {
          // Create view model for dashboard statistics
          var oViewModel = new JSONModel({
            totalEmployees: 0,
            pendingRequests: 0,
            approvedToday: 0,
            totalManagers: 0,
            recentRequests: [],
          });
          this.getView().setModel(oViewModel, "dashboard");
        },

        _loadDashboardData: function () {
          var that = this;
          var oModel = this.getView().getModel();
          var oDashboardModel = this.getView().getModel("dashboard");

          // Load employees count
          oModel
            .bindList("/Employees")
            .requestContexts()
            .then(function (aContexts) {
              oDashboardModel.setProperty("/totalEmployees", aContexts.length);
            });

          // Load managers count
          oModel
            .bindList("/Managers")
            .requestContexts()
            .then(function (aContexts) {
              oDashboardModel.setProperty("/totalManagers", aContexts.length);
            });

          // Load leave requests statistics
          var oLeaveRequestsBinding = oModel.bindList(
            "/LeaveRequests",
            null,
            null,
            null,
            {
              $expand: "employee,leaveType",
            }
          );

          oLeaveRequestsBinding
            .requestContexts()
            .then(function (aContexts) {
              var aPendingRequests = [];
              var iApprovedToday = 0;
              var aRecentRequests = [];
              var today = new Date().toDateString();

              aContexts.forEach(function (oContext) {
                var oData = oContext.getObject();

                if (oData.status === "Pending") {
                  aPendingRequests.push(oData);
                }

                if (
                  oData.status === "Approved" &&
                  new Date(oData.modifiedAt).toDateString() === today
                ) {
                  iApprovedToday++;
                }

                // Get recent requests (last 5)
                if (aRecentRequests.length < 5) {
                  aRecentRequests.push(oData);
                }
              });

              oDashboardModel.setProperty(
                "/pendingRequests",
                aPendingRequests.length
              );
              oDashboardModel.setProperty("/approvedToday", iApprovedToday);
              oDashboardModel.setProperty("/recentRequests", aRecentRequests);
            })
            .catch(function (oError) {
              MessageToast.show(
                "Error loading dashboard data: " + oError.message
              );
            });
        },

        onRefresh: function () {
          this._loadDashboardData();
          MessageToast.show("Dashboard data refreshed");
        },

        onTilePress: function (oEvent) {
          var sId = oEvent.getSource().getId();
          var oIconTabBar = this.getView()
            .getParent()
            .getParent()
            .byId("idIconTabBarMulti");

          if (sId.includes("employeesTile")) {
            oIconTabBar.setSelectedKey("employees");
          } else if (sId.includes("pendingTile")) {
            oIconTabBar.setSelectedKey("requests");
          } else if (sId.includes("approvedTile")) {
            oIconTabBar.setSelectedKey("approvals");
          }
        },
      }
    );
  }
);
