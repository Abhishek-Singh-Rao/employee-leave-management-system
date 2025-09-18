using LeaveService from '../srv/leave-service';

annotate LeaveService.Employees with @(
    UI.HeaderInfo             : {
        TypeName      : 'Employee',
        TypeNamePlural: 'Employees',
        Title         : {Value: name},
        Description   : {Value: empId}
    },
    UI.LineItem               : [
        {
            Value: empId,
            Label: 'Employee ID'
        },
        {
            Value: name,
            Label: 'Name'
        },
        {
            Value: email,
            Label: 'Email'
        },
        {
            Value: leaveBalance,
            Label: 'Leave Balance'
        }
    ],
    UI.SelectionFields        : [
        empId,
        name
    ],
    UI.Facets                 : [{
        $Type : 'UI.ReferenceFacet',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneralInfo'
    }],
    UI.FieldGroup #GeneralInfo: {Data: [
        {
            Value: empId,
            Label: 'Employee ID'
        },
        {
            Value: name,
            Label: 'Name'
        },
        {
            Value: email,
            Label: 'Email'
        },
        {
            Value: leaveBalance,
            Label: 'Leave Balance'
        }
    ]}
);

annotate LeaveService.LeaveRequests with @(
    UI.HeaderInfo             : {
        TypeName      : 'Leave Request',
        TypeNamePlural: 'Leave Requests',
        Title         : {Value: employee.name},
        Description   : {Value: employeeId}
    },
    UI.LineItem               : [
        {
            Value: employeeId,
            Label: 'Employee ID'
        },
        {
            Value: employee.name,
            Label: 'Employee'
        },
        {
            Value: leaveType.name,
            Label: 'Leave Type'
        },
        {
            Value: startDate,
            Label: 'Start Date'
        },
        {
            Value: endDate,
            Label: 'End Date'
        },
        {
            Value: days,
            Label: 'Days'
        },
        {
            Value      : status,
            Label      : 'Status',
            Criticality: {$edmJson: {
                $Path : 'status',
                $Apply: [{
                    $Function: 'odata.case',
                    $IsOf    : 'Edm.Byte',
                    Pending  : 2,
                    Approved : 3,
                    Rejected : 1
                }]
            }}
        }
    ],
    UI.SelectionFields        : [
        employeeId,
        leaveTypeCode,
        status
    ],
    UI.Facets                 : [{
        $Type : 'UI.ReferenceFacet',
        Label : 'Request Details',
        Target: '@UI.FieldGroup#RequestInfo'
    }],
    UI.FieldGroup #RequestInfo: {Data: [
        {
            Value: employeeId,
            Label: 'Employee ID'
        },
        {
            Value: leaveTypeCode,
            Label: 'Leave Type'
        },
        {
            Value: startDate,
            Label: 'Start Date'
        },
        {
            Value: endDate,
            Label: 'End Date'
        },
        {
            Value: days,
            Label: 'Days'
        },
        {
            Value: status,
            Label: 'Status'
        },
        {
            Value: reason,
            Label: 'Reason'
        }
    ]}
);
