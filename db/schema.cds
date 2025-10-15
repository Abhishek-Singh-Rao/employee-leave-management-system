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
    code    : String(15) @unique;
    name    : String(40);
    maxDays : Integer;
}

entity LeaveRequest : cuid, managed {
    employeeId    : String(10);
    employee      : Association to Employee
                        on employee.empId = employeeId;
    leaveTypeCode : String(15);
    leaveType     : Association to LeaveType
                        on leaveType.code = leaveTypeCode;
    startDate     : Date;
    endDate       : Date;
    days          : Integer;
    status        : String(20) default 'Pending';
    reason        : String(500);
}

entity Approval : cuid, managed {
    request_ID  : UUID;
    request     : Association to LeaveRequest
                      on request.ID = request_ID;
    employeeId  : String(10);
    managerName : String(100);
    decision    : String(20);
    comments    : String(500);
    employee    : Association to Employee
                      on employee.empId = employeeId;
    manager     : Association to Manager
                      on manager.name = managerName;
}
