sap.ui.define(
  ["sap/ui/core/format/DateFormat", "sap/ui/core/ValueState"],
  function (DateFormat, ValueState) {
    "use strict";

    return {
      /**
       * Rounds the currency value to 2 digits
       */
      currencyValue: function (sValue) {
        if (!sValue) {
          return "";
        }
        return parseFloat(sValue).toFixed(2);
      },

      /**
       * Formats the leave balance
       */
      formatLeaveBalance: function (iBalance) {
        if (!iBalance && iBalance !== 0) {
          return "0 days";
        }
        return iBalance + (iBalance === 1 ? " day" : " days");
      },

      /**
       * Formats the leave balance state for ObjectNumber
       */
      formatLeaveBalanceState: function (iBalance) {
        if (!iBalance && iBalance !== 0) {
          return ValueState.Error;
        }
        if (iBalance <= 5) {
          return ValueState.Error;
        } else if (iBalance <= 10) {
          return ValueState.Warning;
        }
        return ValueState.Success;
      },

      /**
       * Formats the status with appropriate color
       */
      formatStatus: function (sStatus) {
        switch (sStatus) {
          case "Approved":
          case "APPROVED":
            return ValueState.Success;
          case "Rejected":
          case "REJECTED":
            return ValueState.Error;
          case "Pending":
          case "PENDING":
            return ValueState.Warning;
          default:
            return ValueState.None;
        }
      },

      /**
       * Formats approval status
       */
      formatApprovalStatus: function (sDecision) {
        switch (sDecision) {
          case "APPROVED":
            return ValueState.Success;
          case "REJECTED":
            return ValueState.Error;
          default:
            return ValueState.None;
        }
      },

      /**
       * Formats date
       */
      formatDate: function (oDate) {
        if (!oDate) {
          return "";
        }
        var oDateFormat = DateFormat.getDateInstance({
          pattern: "dd/MM/yyyy",
        });
        return oDateFormat.format(new Date(oDate));
      },

      /**
       * Calculate days between dates
       */
      calculateDays: function (startDate, endDate) {
        if (!startDate || !endDate) {
          return 0;
        }
        var start = new Date(startDate);
        var end = new Date(endDate);
        var timeDifference = end.getTime() - start.getTime();
        var daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
        return daysDifference > 0 ? daysDifference : 0;
      },

      /**
       * Format status icon
       */
      getStatusIcon: function (sStatus) {
        switch (sStatus) {
          case "Approved":
          case "APPROVED":
            return "sap-icon://accept";
          case "Rejected":
          case "REJECTED":
            return "sap-icon://decline";
          case "Pending":
          case "PENDING":
            return "sap-icon://pending";
          default:
            return "sap-icon://question-mark";
        }
      },

      /**
       * Format approval icon
       */
      getApprovalIcon: function (sDecision) {
        switch (sDecision) {
          case "APPROVED":
            return "sap-icon://accept";
          case "REJECTED":
            return "sap-icon://decline";
          default:
            return "sap-icon://question-mark";
        }
      },

      /**
       * Format employee status
       */
      formatEmployeeStatus: function (iLeaveBalance) {
        if (iLeaveBalance <= 0) {
          return "No Leave Balance";
        } else if (iLeaveBalance <= 5) {
          return "Low Balance";
        } else if (iLeaveBalance <= 10) {
          return "Medium Balance";
        }
        return "Good Balance";
      },
    };
  }
);
