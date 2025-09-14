namespace leave;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity Employee : cuid, managed {
    empId        : String(10) @unique;
    name         : String(100);
    email        : String(100);
    managerId    : UUID;
    manager      : Association to Manager
                       on manager.ID = managerId;
    leaveBalance : Integer default 20;
}

entity Manager : cuid, managed {
    name  : String(100);
    email : String(100);
}

entity LeaveType : cuid {
    code    : String(10) @unique;
    name    : String(40);
    maxDays : Integer;
}

entity LeaveRequest : cuid, managed {
    employeeId    : String(10);
    employee      : Association to Employee
                        on employee.empId = employeeId;
    leaveTypeCode : String(10);
    leaveType     : Association to LeaveType
                        on leaveType.code = leaveTypeCode;
    startDate     : Date;
    endDate       : Date;
    days          : Integer;
    status        : String(20) default 'Pending';
    reason        : String(500);
}

entity Approval : cuid, managed {
    employeeId  : String(10); // Which employee's request
    managerName : String(100); // Which manager approved
    decision    : String(20); // Approved/Rejected
    comments    : String(500);
    // Optional associations for convenience
    employee    : Association to Employee
                      on employee.empId = employeeId;
    manager     : Association to Manager
                      on manager.name = managerName;
}
