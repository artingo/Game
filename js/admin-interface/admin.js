/**
 * Controller class driving the Admin Interface
 * @author Fred Walther
 * @date
 */
var CsaAdmin = {

    // SlickGrid parameters
    grid_options: {
        autoEdit:               false,
        editable:               true,
        enableAddRow:           false,
        enableCellNavigation:   true,
        forceFitColumns:        false,
        selectable:             true,
        sortable:               true
    },
    // Options for SlickGrid editors
    roles:  {},
    types:  [],
    lvgs:   [],
    callsigns:  [],
    stcs:   [],
    tcs:    [],

    /**
     * Adds the 'username' to the HTTP-Header
     * @param xhr
     */
    injectUsername: function (xhr) {
        if(window.location.hostname.indexOf("localhost") > -1) {
            var username = CsaAdmin.getParameterByName("username") || "iukaf3";
            xhr.setRequestHeader("username", username);
        }
    },

    /**
     * Filters a request parameter value from the URL
     * @param name
     * @returns {Array|{index: number, input: string}|string}
     */
    getParameterByName: function (name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    },

    /**
     * Calls a REST service and feeds a SlickGrid table via callback
     * @param url, service name
     * @param key, name of JSON property with response data
     * @param options, reference to editor options
     * @param callback, function that initializes editor
     * @returns jqXHR
     */
    loadGeneric:  function (url, key, options, callback) {
        return $.ajax({
            type: "GET",
            url: "services/" + url + ".json",
            beforeSend: CsaAdmin.injectUsername
        }).done(function (data, textStatus, jqXHR) {
            if(options) {
                $.each(options, function(index, option) {
                    CsaAdmin[option] = data[option];
                });
            }
            var paramData = data[key];
            if(callback && paramData) {
                callback(paramData);
            } else {
                CsaAdmin.showError("No data for '" + key + "'");
            }
        }).fail(function (data, textStatus, jqXHR) {
            CsaAdmin.showError(data.statusText);
        });
    },

    /**
     * Initializes a SlickGrid table
     * @param id - id of container DIV
     * @param data - JSON data to use
     * @param columns - SlickGrid columns definition
     * @param sortColumn - initial sort column
     * @param updateFunction - being called after a value change (e.g. JSON call)
     * @param isCellEditableFunction - checks if this cell may be edited
     */
    displayGeneric: function (id, data, columns, sortColumn, updateFunction, isCellEditableFunction) {
        var dataview = new Slick.Data.DataView();
        var grid = new Slick.Grid("#" + id, dataview, columns, this.grid_options);

        grid.setSelectionModel(new Slick.RowSelectionModel());
        grid.onCellChange.subscribe(updateFunction);
        if(isCellEditableFunction) {
            grid.onBeforeEditCell.subscribe(function(e,args) {
                return isCellEditableFunction(args);
            });
        }
        grid.onSort.subscribe(function(e, args) {
            SortFunction(e, args, dataview);
        });
        dataview.onRowsChanged.subscribe(function(e, args) {
            RowsChangedFunction(e, args, grid);
        });
        dataview.onRowCountChanged.subscribe(function (e, args) {
            RowCountFunction(e, args, grid);
        });

        dataview.beginUpdate();
        dataview.setItems(data);
        dataview.endUpdate();

        // fix column bug
        var table = $("#" + id);
        table.data("refresh", function() {
            grid.setColumns(columns);
        });
        // trigger sorting
        table.find(".slick-header-columns [id$='" + sortColumn + "']").click();
    },

    /**
     * Calls a REST service and passes data to the callback function
     * @param url - service name
     * @param params - request parameter
     * @param callback - being called after successful ajax call
     */
    updateGeneric:  function (url, params, callback) {
        $.ajax({
            url:    "services/"+ url +".json",
            type:   "POST",
            data:   params,
            beforeSend:  CsaAdmin.injectUsername
        }).done(function (data, textStatus, jqXHR) {
            if(data.success) {
                callback();
            } else {
                CsaAdmin.showError(data.error, callback);
            }
        }).fail(function (data, textStatus, jqXHR) {
            CsaAdmin.showError(data.statusText, callback);
        });
    },

    /**
     * Remembers the changed SlickGrid cell
     * @param e - calling event
     * @param args - passed SlickGrid parameters
     */
    onChangeGeneric:function (e, args) {
        var table = $(args.grid.getContainerNode());
        // attach to DIV container as 'data' attribute
        table.data("item", args.item);
    },

    /**
     * Loads the list of Users
     */
    loadUsers:      function() {
        CsaAdmin.loadGeneric("loadUsers", "users", false, CsaAdmin.displayUsers);
    },

    /**
     * Defines 'User' columns and feeds the SlickGrid table
     * @param data - JSON data
     */
    displayUsers:   function(data) {
        var columns = [
            {id: "id",      name: "ID",     field: "id",    width:  50, sortable: true },
            {id: "name",    name: "User",   field: "name",  width: 150, sortable: true, editor: Slick.Editors.Text },
            {id: "role",    name: "Role",   field: "role",  width: 300, sortable: true, editor: PickListEditor, options: CsaAdmin.roles },
            {id: "deleteUser",name: "Delete",field: "del",  width:  60, formatter: ButtonFormatter }
        ];
        CsaAdmin.displayGeneric("usersTable", data, columns, "name", CsaAdmin.updateUser);
    },

    /**
     * Shows a SlickGrid tabele to add a User
     */
    addUserDialog:  function() {
        var data = [{ id:"", name:"", role:"" }];
        var columns = [
            {id: "id",      name: "ID",     field: "id",    width:  50 },
            {id: "name",    name: "User",   field: "name",  width: 150, editor: Slick.Editors.LongText},
            {id: "role",    name: "Role",   field: "role",  width: 200, editor: PickListEditor, options: CsaAdmin.roles }
        ];
        $('#addUserDialog').dialog('open');
        CsaAdmin.displayGeneric("addUserTable", data, columns, "name", CsaAdmin.onChangeGeneric);
    },

    /**
     * Callback click on 'Save' in 'Add User' dialog
     */
    createUser:     function() {
        var item = $("#addUserTable").data("item");
        if(item) {
            var params = { name: item.name };
            if(item.role != "") {
                var roleId = CsaAdmin.roles[item.role];
                $.extend(params, { role: roleId });
            }
            console.log("[createUser]", params);
        }
        CsaAdmin.updateGeneric("createUser", params, CsaAdmin.loadUsers);
    },

    /**
     * Callback after double click on a SlickGrid cell
     * @param e - calling event
     * @param args - parameters passed by SlickGrid
     */
    updateUser:     function (e, args) {
        // which column number was clicked?
        switch(args.cell) {
            case 1: // name
            case 2: // role
                var params = {
                    id:     args.item.id,
                    name:   args.item.name,
                    role:   CsaAdmin.roles[args.item.role]
                };
                // call JSON
                CsaAdmin.updateGeneric("updateUser", params, CsaAdmin.loadUsers);
                break;
        }
    },

    /**
     * Called after click on 'Delete' button
     * @param id - Database id of User in this SlickGrid cell
     */
    deleteUser:     function(id) {
        var params = { "id": id };
        CsaAdmin.updateGeneric("deleteUser", params, CsaAdmin.loadUsers);
    },

    /**
     * Loads list of Roles (even after CRUD)
     */
    loadRoles:      function () {
        CsaAdmin.loadGeneric("loadRoles", "roles", ["options"], CsaAdmin.displayRoles);
    },

    /**
     * Defines 'Roles' columns and feeds the SlickGrid table
     * @param data - JSON data
     */
    displayRoles:   function (data) {
        var columns = [
            {id: "id",      name: "",       field: "id",    width:  50, sortable: true },
            //{id: "roleId",  name: "ID",     field: "roleId",width:  50, sortable: true },
            {id: "name",    name: "Role",   field: "name",  width: 150, sortable: true, editor: Slick.Editors.Text },
            {id:"scVisible",name: "Swap Candidate", field: "scVisible", width: 130, sortable: true, cssClass: "center", formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox },
            {id: "isAdmin", name: "Admin",  field: "isAdmin",width: 70, sortable: true, cssClass: "center", formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox },
            {id: "lvg",     name: "Permissions", field: "lvg",   width: 600 } // , editor: PickListEditor
        ];
        CsaAdmin.displayGeneric("rolesTable", data, columns, "role", CsaAdmin.updateRole); //, "roleId");
    },

    /**
     * Called by 'Add role' button, shows 'addRoleDialog'
     */
    addRoleDialog:  function() {
        $("#newRoleName").val("").focus();
        $("#newRoleWritable").val("r");
        $('#addRoleDialog').dialog('open');
    },

    /**
     * Callback after click on 'Save' button in 'addRoleDialog'
     */
    createRole:     function() {
        var isWriteable = ($("#newRoleWritable option:selected").val() == "r/w");
        var params = {
            name:       $("#newRoleName").val(),
            writeable:  isWriteable
        };

        $.ajax({
            type:   "POST",
            url:    "services/createRole.json",
            data:   params,
            beforeSend: CsaAdmin.injectUsername
        }).done(function (data, textStatus, jqXHR) {
            $("#addRoleDialog").dialog("close");
            CsaAdmin.loadRoles();
        }).fail(function (data, textStatus, jqXHR) {
            $("#addRoleDialog").dialog("close");
            CsaAdmin.showError("[createRole] error: " + data.statusText);
        });

    },

    /**
     * Callback after double click on a SlickGrid cell
     * @param e - calling event
     * @param args - parameters passed by SlickGrid
     */
    updateRole:     function (e, args) {
        var item = args.item;
        var params = { id: item.id, name: item.name };
        if(item.scVisible != undefined) {
            $.extend(params, { scVisible: item.scVisible });
        }
        if(item.isAdmin != undefined) {
            $.extend(params, { isAdmin: item.isAdmin });
        }
        // which column number was clicked?
        switch(args.cell) {
            case 1: // role name
            case 2: // Swap Candidate
            case 3: // Admin role
                CsaAdmin.updateGeneric("updateRole", params, CsaAdmin.loadRoles)
        }
    },

    /**
     * Called after click on 'Delete' button
     * @param id - Database id of Role in current SlickGrid row
     */
    deleteRole:     function(id) {
        var params = { "id": id };
        CsaAdmin.updateGeneric("deleteRole", params, CsaAdmin.loadRoles);
    },

    /**
     * Loads list of Permissions (even after CRUD)
     */
    loadPermissions:    function () {
        CsaAdmin.loadGeneric("loadPermissions", "permissions", false, CsaAdmin.displayPermissions);
    },

    /**
     * Defines the 'Permission' columns and feeds the SlickGrid table
     * @param data - JSON data
     */
    displayPermissions: function (data) {
        var columns = [
            {id: "id",      name: "ID",     field: "id",        width:  50, sortable: true },
            {id: "role",    name: "for role",field: "role",     width: 150, sortable: true },
            {id:"writeable",name: "R/W",    field: "writeable", width:  50, editor: CustomSelectEditor },
            {id: "filterId",name: "Filter", field: "filterId",  width:  70, sortable: true },
            {id: "filterType",name: "Type", field: "filterType",width:  70, sortable: true },
            {id: "lvg",     name: "LVG",    field: "lvg",       width:  70, sortable: true },
            {id:"callsign", name: "Callsign",field: "callsign", width: 100, sortable: true },
            {id: "stc",     name: "STC",    field: "stc",       width:  70, sortable: true },
            {id: "tc",      name: "TC",     field: "tc",        width:  70, sortable: true }
        ];

        CsaAdmin.displayGeneric("permissionsTable", data, columns, "id", CsaAdmin.updatePermission);
    },

    /**
     * Callback after double click on a SlickGrid cell
     * @param e - calling event
     * @param args - parameters passed by SlickGrid
     */
    updatePermission:   function (e, args) {
        console.log("updatePermission type ", args.item.type);
        var isWriteable = (args.item.writeable == "r/w");
        var params = { id:args.item.id, writeable: isWriteable };
        switch(args.cell) {
            case 2: // LVG
                CsaAdmin.updateGeneric("updatePermission", params, CsaAdmin.loadPermissions)
        }
    },

    /**
     * Called after click on 'Delete' button
     * @param id - Database id of Permission in current SlickGrid row
     */
    deletePermission:   function(id) {
        var params = { "id": id };
        CsaAdmin.updateGeneric("deletePermission", params, CsaAdmin.loadPermissions);
    },

    /**
     * Loads list of Filters (even after CRUD)
     */
    loadFilters:    function () {
        CsaAdmin.loadGeneric("loadFilters", "filters", ["types", "lvgs", "callsigns", "stcs", "tcs"], CsaAdmin.displayFilters);
    },

    /**
     * Defines 'Filter' columns and feeds SlickGrid table
     * @param data - JSON data
     */
    displayFilters: function (data) {
        var columns = [
            {id: "id",      name: "ID",     field: "id",    width:  50, sortable: true },
            {id: "type",    name: "Type",   field: "type",  width:  60, sortable: true },
            {id: "lvg",     name: "LVG",    field: "lvg",   width: 100, sortable: true, editor: ComboBoxEditor,
                options: CsaAdmin.lvgs, editableTypes: ["lvg", "lvgstc"],   maxlength: 3 },
            {id:"callsign", name:"Callsign",field:"callsign",width:100, sortable: true, editor: ComboBoxEditor,
                options: CsaAdmin.callsigns,  editableTypes: ["callsign"],  maxlength: 8 },
            {id: "stc",     name: "STC",    field: "stc",   width: 100, sortable: true, editor: ComboBoxEditor,
                options: CsaAdmin.stcs, editableTypes: ["lvgstc", "tcstc"], maxlength: 2 },
            {id: "tc",      name: "TC",     field: "tc",    width: 100, sortable: true, editor: ComboBoxEditor,
                options: CsaAdmin.tcs,  editableTypes: ["tcstc"], maxlength: 1 }
        ];
        CsaAdmin.displayGeneric("filtersTable", data, columns, "type", CsaAdmin.updateFilter, CsaAdmin.isFilterEditable);
    },

    /**
     * Checks if current cell is editable ('editableTypes' in SlickGrid colums)
     * @param args
     * @returns {boolean}
     */
    isFilterEditable:   function(args) {
        var index = $.inArray(args.item.type, args.column.editableTypes);
        var isEditable = (index > -1);
        //console.log(args.item.type, args.column.editableTypes, index, isEditable);
        return isEditable;
    },

    /**
     * Called by 'Add Filter' button, shows 'addFilterDialog'
     */
    addFilterDialog:    function() {
        var data = [{ id: "", type: "lvg"}];
        var columns = [
            {id: "id",      name: "ID",     field: "id",    width:  50 },
            {id: "type",    name: "Type",   field: "type",  width:  60, autoEdit: true,
                editor: PickListEditor, options: CsaAdmin.types, editableTypes: CsaAdmin.types },
            {id: "lvg",     name: "LVG",    field: "lvg",   width: 100, editor: ComboBoxEditor,
                options: CsaAdmin.lvgs, editableTypes: ["lvg", "lvgstc"],   maxlength: 3 },
            {id:"callsign", name:"Callsign",field:"callsign",width:100, editor: ComboBoxEditor,
                options: CsaAdmin.callsigns,  editableTypes: ["callsign"],  maxlength: 8 },
            {id: "stc",     name: "STC",    field: "stc",   width: 100, editor: ComboBoxEditor,
                options: CsaAdmin.stcs, editableTypes: ["lvgstc", "tcstc"], maxlength: 2 },
            {id: "tc",      name: "TC",     field: "tc",    width: 100, editor: ComboBoxEditor,
                options: CsaAdmin.tcs,  editableTypes: ["tcstc"], maxlength: 1 }
        ];
        $('#addFilterDialog').dialog('open');
        CsaAdmin.displayGeneric("addFilterTable", data, columns, "type", CsaAdmin.onChangeGeneric, CsaAdmin.isFilterEditable);
    },

    /**
     * Callback after click on 'Save' button in 'addFilterDialog'
     */
    createFilter:   function() {
        var item = $("#addFilterTable").data("item");
        console.log("[createFilter]", item);
        CsaAdmin.updateGeneric("createFilter", $.param(item), CsaAdmin.loadFilters);
    },

    /**
     * Callback after double click on a SlickGrid cell
     * @param e - calling event
     * @param args - parameters passed by SlickGrid
     */
    updateFilter:   function (e, args) {
        console.log("updateFilter type ", args.item.type)
        switch(args.cell) {
            case 2: // LVG
            case 3: // callsign
            case 4: // STC
            case 5: // TC
                CsaAdmin.updateGeneric("updateFilter", $.param(args.item), CsaAdmin.loadFilters)
        }
    },

    /**
     * Called after click on 'Delete' button
     * @param id - Database id of Filter in current SlickGrid row
     */
    deleteFilter:   function(id) {
        var params = { "id": id };
        CsaAdmin.updateGeneric("deleteFilter", params, CsaAdmin.loadFilters);
    },

    /**
     * Shows an error dialog
     * @param message - Error message
     * @param callback - being called after click on 'Close' button
     */
    showError:      function(message, callback) {
        if(callback) {
            $("#showErrorDialog").on("dialogbeforeclose", callback);
        } else {
            $("#showErrorDialog").off("dialogbeforeclose");
        }
        $("#errorMessage").text(message);
        $("#showErrorDialog").dialog("open");
    },

    /**
     * Called by 'Delete' button, shows 'confirmDeleteDialog'
     * @param id - Database id of User in this SlickGrid cell
     * @param callback - being called after click on 'Delete' button
     */
    confirmDeleteDialog:    function(id, callback) {
        $("#confirmDeleteDialog").dialog({
            modal:      true,
            resizable:  false,
            buttons: {
                Cancel: function() { $(this).dialog('close'); },
                Delete: function() {
                    $(this).dialog('close');
                    if(callback) callback(id);
                }
            }
        });
    }
};

CsaAdmin.loadUsers();
CsaAdmin.loadRoles();
CsaAdmin.loadPermissions();
CsaAdmin.loadFilters();


function CustomSelectEditor(args) {
    var $select;
    var defaultValue;

    this.init = function () {
        $select = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='r/w'>r/w</OPTION><OPTION value='r'>r</OPTION></SELECT>");
        $select.appendTo(args.container);
        $select.focus();
    };

    this.destroy = function () {
        $select.remove();
    };

    this.focus = function () {
        $select.focus();
    };

    this.loadValue = function (item) {
        $select.val(item[args.column.field]);
        $select.select();
    };

    this.serializeValue = function () {
        return $select.val();
    };

    this.applyValue = function (item, state) {
        item[args.column.field] = state;
    };

    this.isValueChanged = function () {
        return ($select.val() != defaultValue);
    };

    this.validate = function () {
        return {
            valid: true,
            msg: null
        };
    };

    this.init();
}

function ButtonFormatter(row, cell, value, columnDef, dataContext){
    var deleteFunction = columnDef.id;
    var button = '<button type="button" class="ui-button ui-widget ui-state-default ui-button-text-only ui-corner-all"' +
        'onclick="CsaAdmin.confirmDeleteDialog(' + dataContext.id + ', CsaAdmin.'+deleteFunction+')">' +
        '<span class="ui-button-text">Delete</span></button>';
    return button;
}

function SortFunction(e, args, dataView) {
    var sortField = args.sortCol.field;
    var IdSorter = function(a, b) {
        var aValue = parseInt(a[sortField]);
        var bValue = parseInt(b[sortField]);
        return (aValue == bValue)? 0 : aValue > bValue? 1 : -1;
    }
    if((/id$/i).test(sortField)) {
        dataView.sort(IdSorter, args.sortAsc);
    } else {
        dataView.fastSort(sortField, args.sortAsc);
    }
}

function RowCountFunction(e, args, grid) {
    grid.updateRowCount();
    grid.render();
}

function RowsChangedFunction (e, args, grid) {
    grid.invalidateRows(args.rows);
    grid.render();
}

// https proxy workaround
if ($.browser.msie) {
    var DanaJsOrg = window.DanaJs;
    var DanaJsFast = function (s) {
        return s;
    };
    $.parseJSON = function (data) {
        window.DanaJs = DanaJsFast;
        var val = (new Function("return " + data))();
        window.DanaJs = DanaJsOrg;
        return val;
    };
}

function PickListEditor(args) {
    var $select;
    var defaultValue;
    var self = this;
    var options;

    this.init = function() {
        options = args.column.options;
        var option_str = "";
        var isArray = $.isArray(options);
        console.log("PickListEditor ", isArray);
        $.each(options, function(labelOrIndex, value) {
            var label = isArray? value : labelOrIndex;
            option_str += "<OPTION value=\"" +value+ "\">" +label+ "</OPTION>";
        });
        var multiple = args.column.multiselect? " multiple='multiple' class='multiselect'" : "";
        $select = $("<select" + multiple + ">"+ option_str +"</select>");
        $select.on("blur", args.commitChanges);
        $select.appendTo(args.container);
        $select.focus();
    };

    this.destroy = function() {
        $select.remove();
    };

    this.focus = function() {
        $select.focus();
    };

    this.loadValue = function(item) {
        var defaultLabel = item[args.column.field];
        if(defaultLabel) {
            defaultValue = options[defaultLabel];
            $select.val(defaultValue);
        }
        //console.log("[loadValue] ", args.column.field, item);
    };

    this.serializeValue = function() {
        return options? $select.val() : "";
    };

    this.applyValue = function(item, state) {
        var newValue = $(":selected", $select).text();
        //console.log("[applyValue] ", newValue);
        item[args.column.field] = newValue;
    };

    this.isValueChanged = function() {
        return ($select.val() != defaultValue);
    };

    this.validate = function() {
        return { valid: true, msg: null };
    };

    this.init();
}

function ComboBoxEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;

    this.init = function () {
        var maxlengthAttr = args.column.maxlength? 'maxlength="' + args.column.maxlength + '"' : '';
        $input = $('<INPUT type="text" class="editor-text" ' + maxlengthAttr + '/>').appendTo(args.container);
        $($input).autocomplete({
            //delay:      0,
            minLength:  0,
            source:     args.column.options
        }).focus(function(){
            $(this).data("autocomplete").search($(this).val());
        });
    };

    this.destroy = function () {
        $input.remove();
    };

    this.focus = function () {
        $input.focus();
    };

    this.getValue = function () {
        return $input.val();
    };

    this.setValue = function (val) {
        $input.val(val);
    };

    this.loadValue = function (item) {
        defaultValue = item[args.column.field] || "";
        $input.val(defaultValue);
        $input[0].defaultValue = defaultValue;
        $input.select();
    };

    this.serializeValue = function () {
        return $input.val();
    };

    this.applyValue = function (item, state) {
        item[args.column.field] = state;
    };

    this.isValueChanged = function () {
        return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
        if (args.column.validator) {
            var validationResults = args.column.validator($input.val());
            if (!validationResults.valid) {
                return validationResults;
            }
        }

        return {
            valid: true,
            msg: null
        };
    };

    this.init();
}

/**
 * Initialize dialogs and tabs
 */
$(document).ready(function () {
    $("#addUserDialog").dialog({
        autoOpen:   false,
        modal:      true,
        resizable:  false,
        width:      450,
        buttons: {
            Cancel: function() { $(this).dialog('close'); },
            Save:   function() {
                $(this).dialog('close');
                CsaAdmin.createUser();
            }
        }
    });
    $("#addRoleDialog").dialog({
        autoOpen:   false,
        modal:      true,
        resizable:  false,
        width:      700,
        buttons: {
            Cancel: function() { $(this).dialog('close'); },
            Save:   CsaAdmin.createRole
        }
    });
    $("#addFilterDialog").dialog({
        autoOpen:   false,
        modal:      true,
        resizable:  false,
        width:      600,
        buttons: {
            Cancel: function() { $(this).dialog('close'); },
            Save:   function() {
                $(this).dialog('close');
                CsaAdmin.createFilter();
            }
        }
    });

    $("#showErrorDialog").dialog({
        autoOpen:   false,
        modal:      true,
        width:      500,
        buttons:    { OK: function() { $(this).dialog('close'); } }
    });

    // show tabs
    var csaBody = $(".csa-body").tabs();
    csaBody.bind("tabsshow", function (event, ui) {
        // hide all 'Add' buttons
        $("#add-buttons BUTTON").addClass("template");
        // show current 'Add' button
        var infix = ui.tab.hash.match(/#(.*)\-/).pop();
        $("#add-"+infix+"-button").removeClass("template");

        // refresh slickgrid
        var refreshFunction = $(".slick-table", ui.panel).data("refresh");
        if(refreshFunction) {
            refreshFunction();
        }
    });
    csaBody.tabs("select", 2);
    $("#add-permissions-button").removeClass("template");
});
