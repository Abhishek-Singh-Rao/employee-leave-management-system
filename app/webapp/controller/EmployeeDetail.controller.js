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

    return Controller.extend(
      "com.company.leavemanagement.controller.EmployeeDetail",
      {
        onInit: function () {
          console.log("👤 EmployeeDetail controller initialized");
          this._initializeLocalModel();

          // Set up routing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("employeeDetail")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          const sEmployeeId = oEvent.getParameter("arguments").employeeId;
          console.log("📍 Employee Detail route matched for ID:", sEmployeeId);

          this._loadEmployeeData(sEmployeeId);
        },

        _initializeLocalModel: function () {
          const oLocalModel = new JSONModel({
            employeeId: null,
            leaveRequests: [],
            stats: {
              totalRequests: 0,
              approvedRequests: 0,
              pendingRequests: 0,
              rejectedRequests: 0,
              totalDaysTaken: 0,
            },
          });
          this.getView().setModel(oLocalModel, "local");
        },

        _loadEmployeeData: function (sEmployeeId) {
          const oModel = this.getView().getModel();
          if (!oModel) {
            setTimeout(() => this._loadEmployeeData(sEmployeeId), 500);
            return;
          }

          // Bind the view to the specific employee
          const sPath = `/Employees(${sEmployeeId})`;
          this.getView().bindElement({
            path: sPath,
            parameters: {
              $expand: "manager",
            },
          });

          // Load employee's leave requests
          this._loadLeaveRequests(sEmployeeId);

          // Store employee ID for reference
          this.getView()
            .getModel("local")
            .setProperty("/employeeId", sEmployeeId);
        },

        _loadLeaveRequests: function (sEmployeeId) {
          const oModel = this.getView().getModel();

          // Get employee's empId first
          oModel
            .bindContext(`/Employees(${sEmployeeId})`)
            .requestObject()
            .then((oEmployee) => {
              const sEmpId = oEmployee.empId;

              // Load leave requests for this employee
              oModel
                .bindList("/LeaveRequests", null, null, null, {
                  $filter: `employeeId eq '${sEmpId}'`,
                  $expand: "leaveType",
                  $orderby: "startDate desc",
                })
                .requestContexts()
                .then((aContexts) => {
                  const aRequests = aContexts.map((ctx) => ctx.getObject());

                  // Update local model
                  const oLocalModel = this.getView().getModel("local");
                  oLocalModel.setProperty("/leaveRequests", aRequests);

                  // Calculate statistics
                  this._calculateStatistics(aRequests);

                  console.log(
                    `📊 Loaded ${aRequests.length} leave requests for employee ${sEmpId}`
                  );
                })
                .catch((error) => {
                  console.error("❌ Failed to load leave requests:", error);
                });
            })
            .catch((error) => {
              console.error("❌ Failed to load employee data:", error);
              MessageBox.error("Employee not found");
              this.onNavBack();
            });
        },

        _calculateStatistics: function (aRequests) {
          const oLocalModel = this.getView().getModel("local");

          const stats = {
            totalRequests: aRequests.length,
            approvedRequests: aRequests.filter(
              (req) => req.status === "Approved"
            ).length,
            pendingRequests: aRequests.filter((req) => req.status === "Pending")
              .length,
            rejectedRequests: aRequests.filter(
              (req) => req.status === "Rejected"
            ).length,
            totalDaysTaken: aRequests
              .filter((req) => req.status === "Approved")
              .reduce((total, req) => total + (req.days || 0), 0),
          };

          oLocalModel.setProperty("/stats", stats);
        },

        // Navigation
        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("employeeList");
        },

        // Actions
        onEdit: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          // Navigate back to employee list and open edit dialog
          // Or implement inline editing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("employeeList", {}, true);

          // TODO: Trigger edit dialog in employee list
          MessageToast.show(
            "Edit functionality - navigate to employee list and use edit button"
          );
        },

        onDelete: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          const oEmployee = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to delete employee ${oEmployee.name} (${oEmployee.empId})?\n\nThis action cannot be undone.`,
            {
              title: "Delete Employee",
              icon: MessageBox.Icon.WARNING,
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this._deleteEmployee(oContext);
                }
              },
            }
          );
        },

        _deleteEmployee: function (oContext) {
          oContext
            .delete()
            .then(() => {
              MessageToast.show("Employee deleted successfully");
              this.onNavBack();
            })
            .catch((error) => {
              console.error("❌ Delete failed:", error);
              MessageBox.error("Failed to delete employee: " + error.message);
            });
        },

        // Leave Request Actions
        onNewLeaveRequest: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          const oEmployee = oContext.getObject();

          // TODO: Implement leave request dialog or navigate to leave request form
          MessageToast.show(
            `New leave request for ${oEmployee.name} - Feature coming in Phase 3`
          );
        },

        // Quick Actions
        onSendEmail: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          const oEmployee = oContext.getObject();

          if (oEmployee.email) {
            const sSubject = encodeURIComponent(
              "Leave Management System - Message"
            );
            const sBody = encodeURIComponent(
              `Dear ${oEmployee.name},\n\nThis is a message from the Leave Management System.\n\nBest regards,\nHR Team`
            );
            const sMailtoLink = `mailto:${oEmployee.email}?subject=${sSubject}&body=${sBody}`;

            window.open(sMailtoLink);
            MessageToast.show(`Email client opened for ${oEmployee.email}`);
          } else {
            MessageBox.warning("No email address available for this employee");
          }
        },

        onViewCalendar: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          const oEmployee = oContext.getObject();
          MessageToast.show(
            `Calendar view for ${oEmployee.name} - Feature coming in advanced phase`
          );

          // TODO: Implement calendar integration showing employee's leave schedule
        },

        onGenerateReport: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          const oEmployee = oContext.getObject();
          const aLeaveRequests = this.getView()
            .getModel("local")
            .getProperty("/leaveRequests");

          // Simple report generation
          this._generateEmployeeReport(oEmployee, aLeaveRequests);
        },

        _generateEmployeeReport: function (oEmployee, aLeaveRequests) {
          const oStats = this.getView().getModel("local").getProperty("/stats");

          let sReport = `EMPLOYEE LEAVE REPORT\n`;
          sReport += `========================\n\n`;
          sReport += `Employee: ${oEmployee.name} (${oEmployee.empId})\n`;
          sReport += `Email: ${oEmployee.email}\n`;
          sReport += `Manager: ${oEmployee.manager?.name || "Not assigned"}\n`;
          sReport += `Current Leave Balance: ${oEmployee.leaveBalance} days\n\n`;

          sReport += `LEAVE STATISTICS\n`;
          sReport += `----------------\n`;
          sReport += `Total Requests: ${oStats.totalRequests}\n`;
          sReport += `Approved: ${oStats.approvedRequests}\n`;
          sReport += `Pending: ${oStats.pendingRequests}\n`;
          sReport += `Rejected: ${oStats.rejectedRequests}\n`;
          sReport += `Total Days Taken: ${oStats.totalDaysTaken}\n\n`;

          if (aLeaveRequests.length > 0) {
            sReport += `RECENT LEAVE REQUESTS\n`;
            sReport += `--------------------\n`;
            aLeaveRequests.slice(0, 10).forEach((request, index) => {
              sReport += `${index + 1}. ${
                request.leaveType?.name || "Unknown"
              } - `;
              sReport += `${this.formatDate(
                request.startDate
              )} to ${this.formatDate(request.endDate)} `;
              sReport += `(${request.days} days) - ${request.status}\n`;
            });
          }

          sReport += `\n\nReport generated on: ${new Date().toLocaleString()}\n`;

          // Create and download as text file
          const blob = new Blob([sReport], { type: "text/plain" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `Employee_Report_${oEmployee.empId}_${
            new Date().toISOString().split("T")[0]
          }.txt`;
          link.click();
          window.URL.revokeObjectURL(url);

          MessageToast.show("Employee report downloaded");
        },

        onAdjustBalance: function () {
          const oContext = this.getView().getBindingContext();
          if (!oContext) {
            MessageBox.error("Employee data not loaded");
            return;
          }

          if (!this._oBalanceDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.company.leavemanagement.fragment.AdjustBalanceDialog",
              controller: this,
            })
              .then((oDialog) => {
                this._oBalanceDialog = oDialog;
                this.getView().addDependent(oDialog);
                this._showBalanceDialog();
              })
              .catch(() => {
                // Fallback to simple input dialog if fragment not found
                this._showSimpleBalanceDialog();
              });
          } else {
            this._showBalanceDialog();
          }
        },

        _showBalanceDialog: function () {
          const oEmployee = this.getView().getBindingContext().getObject();
          const oDialogModel = new JSONModel({
            currentBalance: oEmployee.leaveBalance,
            newBalance: oEmployee.leaveBalance,
            adjustment: 0,
            reason: "",
          });
          this._oBalanceDialog.setModel(oDialogModel, "dialog");
          this._oBalanceDialog.open();
        },

        _showSimpleBalanceDialog: function () {
          const oEmployee = this.getView().getBindingContext().getObject();

          MessageBox.show(
            `Current leave balance: ${oEmployee.leaveBalance} days\n\nEnter new balance:`,
            {
              icon: MessageBox.Icon.QUESTION,
              title: "Adjust Leave Balance",
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              initialFocus: MessageBox.Action.OK,
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  // Simple implementation - in real scenario, use proper dialog
                  const sNewBalance = prompt(
                    "Enter new leave balance:",
                    oEmployee.leaveBalance
                  );
                  if (sNewBalance && !isNaN(sNewBalance)) {
                    this._updateLeaveBalance(parseInt(sNewBalance));
                  }
                }
              },
            }
          );
        },

        _updateLeaveBalance: function (iNewBalance) {
          const oContext = this.getView().getBindingContext();
          const oModel = this.getView().getModel();

          oContext.setProperty("leaveBalance", iNewBalance);

          oModel
            .submitBatch("updateGroup")
            .then(() => {
              MessageToast.show("Leave balance updated successfully");
              this._closeBalanceDialog();
            })
            .catch((error) => {
              console.error("❌ Balance update failed:", error);
              MessageBox.error(
                "Failed to update leave balance: " + error.message
              );
            });
        },

        onSaveBalance: function () {
          const oDialogModel = this._oBalanceDialog.getModel("dialog");
          const iNewBalance = oDialogModel.getProperty("/newBalance");

          if (isNaN(iNewBalance) || iNewBalance < 0) {
            MessageBox.error("Please enter a valid positive number");
            return;
          }

          this._updateLeaveBalance(iNewBalance);
        },

        onCancelBalance: function () {
          this._closeBalanceDialog();
        },

        _closeBalanceDialog: function () {
          if (this._oBalanceDialog) {
            this._oBalanceDialog.close();
          }
        },

        // Formatters
        formatDate: function (sDate) {
          if (!sDate) return "";
          const oDate = new Date(sDate);
          return oDate.toLocaleDateString();
        },

        formatDateTime: function (sDateTime) {
          if (!sDateTime) return "";
          const oDate = new Date(sDateTime);
          return oDate.toLocaleString();
        },

        // Cleanup
        onExit: function () {
          if (this._oBalanceDialog) {
            this._oBalanceDialog.destroy();
          }
        },
      }
    );
  }
);
