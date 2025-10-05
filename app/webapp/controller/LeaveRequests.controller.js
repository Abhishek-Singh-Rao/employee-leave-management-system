sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Sorter
  ) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.LeaveRequests",
      {
        onInit: function () {
          console.log("LeaveRequests controller initialized");
          this._initializeLocalModel();
          this._loadStatistics();

          // Set up routing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("leaveRequests")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("Leave Requests route matched");
          this.onRefresh();
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            stats: {
              totalRequests: 0,
              pendingCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
            },
            totalRequests: 0,
            searchQuery: "",
            selectedStatus: "",
            selectedLeaveType: "",
          });
          this.getView().setModel(oLocalModel, "local");
        },

        _loadStatistics: function () {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadStatistics(), 500);
            return;
          }

          oModel
            .bindList("/LeaveRequests")
            .requestContexts(0, 1000)
            .then((aContexts) => {
              const requests = aContexts.map((ctx) => ctx.getObject());
              const oLocalModel = this.getView().getModel("local");

              // Calculate statistics
              const totalRequests = requests.length;
              const pendingCount = requests.filter(
                (req) => req.status === "Pending"
              ).length;
              const approvedCount = requests.filter(
                (req) => req.status === "Approved"
              ).length;
              const rejectedCount = requests.filter(
                (req) => req.status === "Rejected"
              ).length;

              oLocalModel.setProperty("/stats", {
                totalRequests,
                pendingCount,
                approvedCount,
                rejectedCount,
              });

              oLocalModel.setProperty("/totalRequests", totalRequests);

              console.log("Leave request statistics loaded:", {
                totalRequests,
                pendingCount,
                approvedCount,
                rejectedCount,
              });
            })
            .catch((error) => {
              console.error("Failed to load statistics:", error);
            });
        },

        // Navigation
        onNavBack: function () {
          console.log("Back button pressed");
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("home");
        },

        onNewLeaveRequest: function () {
          console.log("Navigating to Leave Request Form");
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("leaveRequestForm");
        },

        // Search and Filter
        onSearch: function (oEvent) {
          console.log("Search triggered");
          const sQuery = oEvent.getParameter("query");
          this._applyFilters(sQuery);
        },

        onSearchLiveChange: function (oEvent) {
          const sQuery = oEvent.getParameter("newValue");
          this._applyFilters(sQuery);
        },

        onStatusFilter: function (oEvent) {
          console.log("Status filter changed");
          const oSelectedItem = oEvent.getParameter("selectedItem");
          const sSelectedKey = oSelectedItem ? oSelectedItem.getKey() : "";

          this.getView()
            .getModel("local")
            .setProperty("/selectedStatus", sSelectedKey);
          this._applyFilters();
        },

        onLeaveTypeFilter: function (oEvent) {
          console.log("Leave type filter changed");
          const oSelectedItem = oEvent.getParameter("selectedItem");
          const sSelectedKey = oSelectedItem ? oSelectedItem.getKey() : "";

          this.getView()
            .getModel("local")
            .setProperty("/selectedLeaveType", sSelectedKey);
          this._applyFilters();
        },

        _applyFilters: function (sSearchQuery) {
          const oTable = this.byId("leaveRequestsTable");
          const oBinding = oTable.getBinding("items");

          if (!oBinding) {
            console.error("Table binding not found");
            return;
          }

          const oLocalModel = this.getView().getModel("local");

          // Get filter values
          const sQuery =
            sSearchQuery !== undefined
              ? sSearchQuery
              : this.byId("leaveRequestSearchField").getValue();
          const sStatus = oLocalModel.getProperty("/selectedStatus");
          const sLeaveType = oLocalModel.getProperty("/selectedLeaveType");

          let aFilters = [];

          // Search filter (employee name or ID)
          if (sQuery) {
            aFilters.push(
              new Filter({
                filters: [
                  new Filter("employee/empId", FilterOperator.Contains, sQuery),
                  new Filter("employee/name", FilterOperator.Contains, sQuery),
                ],
                and: false,
              })
            );
          }

          // Status filter
          if (sStatus) {
            aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
          }

          // Leave type filter
          if (sLeaveType) {
            aFilters.push(
              new Filter("leaveType/code", FilterOperator.EQ, sLeaveType)
            );
          }

          oBinding.filter(aFilters);

          console.log("Filters applied:", {
            search: sQuery,
            status: sStatus,
            leaveType: sLeaveType,
          });
        },

        onClearFilters: function () {
          console.log("Clear filters pressed");
          this.byId("leaveRequestSearchField").setValue("");
          this.byId("leaveRequestStatusFilter").setSelectedKey("");
          this.byId("leaveRequestTypeFilter").setSelectedKey("");

          const oLocalModel = this.getView().getModel("local");
          oLocalModel.setProperty("/selectedStatus", "");
          oLocalModel.setProperty("/selectedLeaveType", "");

          const oTable = this.byId("leaveRequestsTable");
          const oBinding = oTable.getBinding("items");
          oBinding.filter([]);

          MessageToast.show("Filters cleared");
        },

        // Table actions
        onRequestPress: function (oEvent) {
          console.log("Request row pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oRequest = oContext.getObject();

          MessageBox.information(
            `Leave Request Details:\n\n` +
              `Employee: ${oRequest.employee?.name || "N/A"} (${
                oRequest.employee?.empId || "N/A"
              })\n` +
              `Leave Type: ${oRequest.leaveType?.name || "N/A"}\n` +
              `Period: ${this.formatDate(
                oRequest.startDate
              )} - ${this.formatDate(oRequest.endDate)}\n` +
              `Days: ${oRequest.days}\n` +
              `Status: ${oRequest.status}\n` +
              `Reason: ${oRequest.reason || "No reason provided"}`,
            {
              title: "Leave Request Details",
            }
          );
        },

        onViewRequest: function (oEvent) {
          console.log("View button pressed");
          const oContext = oEvent.getSource().getBindingContext();
          this.onRequestPress({
            getSource: () => ({ getBindingContext: () => oContext }),
          });
        },

        onCancelRequest: function (oEvent) {
          console.log("Cancel button pressed");
          const oContext = oEvent.getSource().getBindingContext();

          if (!oContext) {
            console.error("No binding context found");
            return;
          }

          const oRequest = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to cancel this leave request?\n\n` +
              `Employee: ${oRequest.employee?.name}\n` +
              `Period: ${this.formatDate(
                oRequest.startDate
              )} - ${this.formatDate(oRequest.endDate)}\n` +
              `Days: ${oRequest.days}`,
            {
              title: "Cancel Leave Request",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this._cancelLeaveRequest(oContext);
                }
              },
            }
          );
        },

        _cancelLeaveRequest: function (oContext) {
          console.log("Cancelling leave request");
          oContext
            .delete()
            .then(() => {
              MessageToast.show("Leave request cancelled successfully");
              this._loadStatistics();
            })
            .catch((error) => {
              console.error("Cancel failed:", error);
              MessageBox.error(
                "Failed to cancel leave request: " + error.message
              );
            });
        },

        onRefresh: function () {
          console.log("Refresh button pressed");
          const oModel = this.getView().getModel();
          oModel.refresh();
          this._loadStatistics();
          MessageToast.show("Leave requests refreshed");
        },

        // Formatters
        formatDate: function (sDate) {
          if (!sDate) return "";

          const oDate = new Date(sDate);
          const options = { year: "numeric", month: "short", day: "numeric" };
          return oDate.toLocaleDateString("en-US", options);
        },

        formatDateTime: function (sDateTime) {
          if (!sDateTime) return "";

          const oDate = new Date(sDateTime);
          const dateOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          const timeOptions = { hour: "2-digit", minute: "2-digit" };

          return (
            oDate.toLocaleDateString("en-US", dateOptions) +
            " " +
            oDate.toLocaleTimeString("en-US", timeOptions)
          );
        },
      }
    );
  }
);
