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
          console.log("🔍 Employee Detail route matched for ID:", sEmployeeId);

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
                  this._deleteEmployee(oContext, oEmployee);
                }
              },
            }
          );
        },

        _deleteEmployee: function (oContext, oEmployee) {
          console.log("🗑️ Deleting employee from detail page");

          const oModel = this.getView().getModel();
          const sEmployeeUUID = oContext.getProperty("ID");

          console.log("📋 Employee details:");
          console.log("   UUID:", sEmployeeUUID);
          console.log("   empId:", oEmployee.empId);
          console.log("   Name:", oEmployee.name);

          // Use direct AJAX for delete (DELETE request)
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = `${sServiceUrl}Employees(${sEmployeeUUID})`;

          console.log("🌐 Making DELETE request to:", sUrl);

          $.ajax({
            url: sUrl,
            type: "DELETE",
            success: () => {
              console.log("✅ Employee deleted successfully");
              MessageToast.show("Employee deleted successfully");

              // Navigate back to employee list
              this.onNavBack();
            },
            error: (xhr, status, error) => {
              console.error("❌ Delete failed");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to delete employee";
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.error?.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }

              MessageBox.error(errorMessage);
            },
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

          // Use simple dialog approach
          this._showSimpleBalanceDialog();
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
          const sEmployeeUUID = oContext.getProperty("ID");

          console.log("💰 Updating leave balance");
          console.log("   UUID:", sEmployeeUUID);
          console.log("   New balance:", iNewBalance);

          // Use direct AJAX for update (PATCH request)
          const sServiceUrl = oModel.sServiceUrl || "/leave/";
          const sUrl = `${sServiceUrl}Employees(${sEmployeeUUID})`;

          console.log("🌐 Making PATCH request to:", sUrl);

          $.ajax({
            url: sUrl,
            type: "PATCH",
            contentType: "application/json",
            data: JSON.stringify({ leaveBalance: iNewBalance }),
            success: (data) => {
              console.log("✅ Leave balance updated successfully");
              MessageToast.show("Leave balance updated successfully");

              // Refresh the view binding
              this.getView().getElementBinding().refresh();
            },
            error: (xhr, status, error) => {
              console.error("❌ Balance update failed");
              console.error("❌ Status:", status);
              console.error("❌ Error:", error);
              console.error("❌ Response:", xhr.responseText);

              let errorMessage = "Failed to update leave balance";
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.error?.message || errorMessage;
              } catch (e) {
                errorMessage = xhr.responseText || errorMessage;
              }

              MessageBox.error(errorMessage);
            },
          });
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
