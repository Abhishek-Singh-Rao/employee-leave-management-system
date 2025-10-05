sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator
  ) {
    "use strict";

    return Controller.extend(
      "com.company.leavemanagement.controller.LeaveRequestForm",
      {
        onInit: function () {
          console.log("📝 LeaveRequestForm controller initialized");
          this._initializeFormModel();

          // Set up routing
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter
            .getRoute("leaveRequestForm")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          console.log("📝 Leave Request Form route matched");
          this._resetForm();
        },

        _initializeFormModel: function () {
          const today = new Date();
          const todayString = this._formatDateForPicker(today);

          const oFormModel = new JSONModel({
            employee_empId: "",
            leaveType_code: "",
            startDate: null,
            endDate: null,
            days: 0,
            reason: "",
            leaveBalance: 0,
            maxDays: 0,
            minDate: todayString,
          });

          this.getView().setModel(oFormModel, "form");
        },

        _resetForm: function () {
          const today = new Date();
          const todayString = this._formatDateForPicker(today);

          const oFormModel = this.getView().getModel("form");
          oFormModel.setData({
            employee_empId: "",
            leaveType_code: "",
            startDate: null,
            endDate: null,
            days: 0,
            reason: "",
            leaveBalance: 0,
            maxDays: 0,
            minDate: todayString,
          });

          // Reset input fields
          this.byId("employeeComboBox").setSelectedKey("");
          this.byId("leaveTypeComboBox").setSelectedKey("");
          this.byId("reasonTextArea").setValue("");
          this.byId("startDatePicker").setDateValue(null);
          this.byId("endDatePicker").setDateValue(null);

          console.log("🔄 Form reset");
        },

        _formatDateForPicker: function (oDate) {
          const year = oDate.getFullYear();
          const month = String(oDate.getMonth() + 1).padStart(2, "0");
          const day = String(oDate.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        },

        // Employee Selection Handler
        onEmployeeChange: function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;

          const sEmployeeId = oSelectedItem.getKey();
          console.log("👤 Employee selected:", sEmployeeId);

          // Load employee's leave balance
          const oModel = this.getView().getModel();
          oModel
            .bindList("/Employees", undefined, undefined, [
              new Filter("empId", FilterOperator.EQ, sEmployeeId),
            ])
            .requestContexts(0, 1)
            .then((aContexts) => {
              if (aContexts.length > 0) {
                const oEmployee = aContexts[0].getObject();
                const oFormModel = this.getView().getModel("form");
                oFormModel.setProperty("/leaveBalance", oEmployee.leaveBalance);
                oFormModel.setProperty("/employee_empId", sEmployeeId);

                console.log(
                  "✅ Employee balance loaded:",
                  oEmployee.leaveBalance
                );

                // Recalculate days if dates are already set
                this._calculateDays();
              }
            })
            .catch((error) => {
              console.error("❌ Failed to load employee:", error);
              MessageToast.show("Failed to load employee details");
            });
        },

        // Leave Type Selection Handler
        onLeaveTypeChange: function (oEvent) {
          const oSelectedItem = oEvent.getParameter("selectedItem");
          if (!oSelectedItem) return;

          const sLeaveTypeCode = oSelectedItem.getKey();
          console.log("📋 Leave type selected:", sLeaveTypeCode);

          // Load leave type details
          const oModel = this.getView().getModel();
          oModel
            .bindList("/LeaveTypes", undefined, undefined, [
              new Filter("code", FilterOperator.EQ, sLeaveTypeCode),
            ])
            .requestContexts(0, 1)
            .then((aContexts) => {
              if (aContexts.length > 0) {
                const oLeaveType = aContexts[0].getObject();
                const oFormModel = this.getView().getModel("form");
                oFormModel.setProperty("/maxDays", oLeaveType.maxDays);
                oFormModel.setProperty("/leaveType_code", sLeaveTypeCode);

                console.log("✅ Leave type max days:", oLeaveType.maxDays);

                // Recalculate days if dates are already set
                this._calculateDays();
              }
            })
            .catch((error) => {
              console.error("❌ Failed to load leave type:", error);
              MessageToast.show("Failed to load leave type details");
            });
        },

        // Date Change Handler
        onDateChange: function (oEvent) {
          console.log("Date changed event triggered");

          // Get the date value from the picker
          const oDatePicker = oEvent.getSource();
          const oDate = oDatePicker.getDateValue();
          const sId = oDatePicker.getId();

          console.log("DatePicker ID:", sId);
          console.log("Selected Date:", oDate);

          // Store in form model
          const oFormModel = this.getView().getModel("form");
          if (sId.includes("startDatePicker")) {
            oFormModel.setProperty(
              "/startDate",
              oDate ? this._formatDateForPicker(oDate) : null
            );
            console.log("Start date updated");
          } else if (sId.includes("endDatePicker")) {
            oFormModel.setProperty(
              "/endDate",
              oDate ? this._formatDateForPicker(oDate) : null
            );
            console.log("End date updated");
          }

          // Small delay to ensure both dates are set
          setTimeout(() => {
            this._calculateDays();
          }, 100);
        },

        // Calculate Days Between Dates
        _calculateDays: function () {
          console.log("=== Calculating days ===");

          const oStartDatePicker = this.byId("startDatePicker");
          const oEndDatePicker = this.byId("endDatePicker");

          const oStartDate = oStartDatePicker.getDateValue();
          const oEndDate = oEndDatePicker.getDateValue();

          console.log("Start Date Object:", oStartDate);
          console.log("End Date Object:", oEndDate);

          const oFormModel = this.getView().getModel("form");

          if (!oStartDate || !oEndDate) {
            console.log("One or both dates are missing");
            oFormModel.setProperty("/days", 0);
            return;
          }

          // Validate end date is after start date
          if (oEndDate < oStartDate) {
            console.log("End date is before start date");
            oFormModel.setProperty("/days", 0);
            MessageToast.show("End date must be after start date");
            return;
          }

          // Calculate days (including both start and end date)
          const timeDiff = oEndDate.getTime() - oStartDate.getTime();
          const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

          oFormModel.setProperty("/days", days);
          console.log("Calculated days:", days);
          console.log("=== Calculation complete ===");
        },

        // Form Validation
        _validateForm: function () {
          console.log("=== Starting form validation ===");

          const oFormModel = this.getView().getModel("form");
          const oFormData = oFormModel.getData();

          // Get actual date values from pickers
          const oStartDatePicker = this.byId("startDatePicker");
          const oEndDatePicker = this.byId("endDatePicker");
          const oStartDate = oStartDatePicker.getDateValue();
          const oEndDate = oEndDatePicker.getDateValue();

          console.log("Validation - Form Data:", oFormData);
          console.log("Validation - Start Date:", oStartDate);
          console.log("Validation - End Date:", oEndDate);

          // Check required fields
          if (!oFormData.employee_empId) {
            MessageBox.error("Please select an employee");
            return false;
          }

          if (!oFormData.leaveType_code) {
            MessageBox.error("Please select a leave type");
            return false;
          }

          if (!oStartDate) {
            MessageBox.error("Please select a start date");
            return false;
          }

          if (!oEndDate) {
            MessageBox.error("Please select an end date");
            return false;
          }

          if (!oFormData.reason || oFormData.reason.trim() === "") {
            MessageBox.error("Please provide a reason for your leave request");
            return false;
          }

          // Validate dates
          if (oEndDate < oStartDate) {
            MessageBox.error("End date must be after or equal to start date");
            return false;
          }

          // Validate days calculation
          if (oFormData.days <= 0) {
            MessageBox.error("Invalid date range. Please select valid dates.");
            return false;
          }

          // Check leave balance
          if (oFormData.days > oFormData.leaveBalance) {
            MessageBox.error(
              `Insufficient leave balance. You have ${oFormData.leaveBalance} days remaining but requested ${oFormData.days} days.`
            );
            return false;
          }

          // Check maximum days for leave type
          if (oFormData.maxDays > 0 && oFormData.days > oFormData.maxDays) {
            MessageBox.error(
              `This leave type allows maximum ${oFormData.maxDays} days, but you requested ${oFormData.days} days.`
            );
            return false;
          }

          console.log("=== Validation passed ===");
          return true;
        },

        // Submit Handler
        onSubmit: function () {
          console.log("📤 Submit button pressed");

          // Validate form
          if (!this._validateForm()) {
            return;
          }

          const oFormModel = this.getView().getModel("form");
          const oFormData = oFormModel.getData();

          // Get actual dates from pickers
          const oStartDatePicker = this.byId("startDatePicker");
          const oEndDatePicker = this.byId("endDatePicker");
          const oStartDate = oStartDatePicker.getDateValue();
          const oEndDate = oEndDatePicker.getDateValue();

          // Prepare data for submission - match schema field names
          const oLeaveRequest = {
            employeeId: oFormData.employee_empId,
            leaveTypeCode: oFormData.leaveType_code,
            startDate: this._formatDateForPicker(oStartDate),
            endDate: this._formatDateForPicker(oEndDate),
            days: oFormData.days,
            reason: oFormData.reason.trim(),
            status: "Pending",
          };

          console.log("Submitting leave request with data:", oLeaveRequest);

          // Submit to backend
          const oModel = this.getView().getModel();

          if (!oModel) {
            console.error("OData model is not available!");
            MessageBox.error("System error: OData model not found");
            return;
          }

          console.log("Model retrieved:", oModel);

          try {
            const oListBinding = oModel.bindList("/LeaveRequests");
            console.log("List binding created:", oListBinding);

            if (!oListBinding) {
              console.error("Failed to create list binding");
              MessageBox.error("Failed to bind to LeaveRequests entity");
              return;
            }

            const oContext = oListBinding.create(oLeaveRequest);

            console.log("Attempting to create leave request...");
            console.log("Context type:", typeof oContext);
            console.log("Context value:", oContext);

            if (!oContext) {
              console.error("Context creation returned null/undefined");
              MessageBox.error(
                "Failed to create context for new leave request"
              );
              return;
            }

            console.log("Submitting batch to backend...");

            // Submit the batch immediately - force send to backend
            oModel
              .submitBatch(oModel.getUpdateGroupId())
              .then(() => {
                console.log(
                  "Batch submitted, waiting for creation confirmation..."
                );

                // Now wait for the created promise
                return oContext.created();
              })
              .then(() => {
                console.log("SUCCESS: Leave request created in backend!");
                MessageBox.success(
                  "Leave request submitted successfully! Your manager will review it soon.",
                  {
                    onClose: () => {
                      const oRouter = this.getOwnerComponent().getRouter();
                      oRouter.navTo("leaveRequests");
                    },
                  }
                );
              })
              .catch((error) => {
                console.error("ERROR: Creation or batch submission failed");
                console.error("Error object:", error);
                console.error("Error message:", error.message);
                console.error("Error status:", error.status);

                // Try to extract backend error message
                let errorMessage = "Failed to submit leave request";

                if (error.error && error.error.message) {
                  errorMessage = error.error.message;
                } else if (error.message) {
                  errorMessage = error.message;
                }

                console.error("Final error message:", errorMessage);
                MessageBox.error("Submission Error: " + errorMessage);
              });
          } catch (error) {
            console.error("EXCEPTION during creation:", error);
            console.error("Exception message:", error.message);
            console.error("Exception stack:", error.stack);
            MessageBox.error("Exception: " + error.message);
          }
        },

        // Cancel Handler
        onCancel: function () {
          MessageBox.confirm(
            "Are you sure you want to cancel? All entered data will be lost.",
            {
              title: "Confirm Cancellation",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  // Navigate back to leave requests list
                  const oRouter = this.getOwnerComponent().getRouter();
                  oRouter.navTo("leaveRequests");
                }
              },
            }
          );
        },

        // Navigation
        onNavBack: function () {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("leaveRequests");
        },
      }
    );
  }
);
