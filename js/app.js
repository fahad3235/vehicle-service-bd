/* Vehicle Service BD \u2014 browser app (DOM + i18n + persistence).
 * Pure logic lives in js/core.js (window.VSBD). All state in localStorage.
 * Supports ?asof=YYYY-MM-DD for deterministic testing.
 */
'use strict';

const STORE_KEY = 'vsbd_v1';
const params = new URLSearchParams(location.search);
const ASOF = params.get('asof') || null;

const I18N = {
  en: {
    appTitle: 'Vehicle Service BD',
    appSubtitle: 'Track services, costs and next dues for your bike or car',
    tabDashboard: 'Dashboard', tabVehicles: 'Vehicles', tabServices: 'Services', tabData: 'Data',
    statTotal: 'Total spent (all time)', statYear: 'Spent this year', statServices: 'Services logged', statVehicles: 'Vehicles',
    upcomingTitle: 'Upcoming service dues', perVehicleTitle: 'Spending per vehicle', recentTitle: 'Recent services',
    noDues: 'No upcoming dues \u2014 set a next-service km or months when you log a service.',
    noServicesYet: 'No services yet \u2014 add your first service above.',
    noVehiclesYet: 'No vehicles yet \u2014 add your first vehicle above.',
    overdue: 'Overdue', dueSoon: 'Due soon', okDue: 'OK', noDue: 'No due set',
    kmLeft: '{n} km left', daysLeft: '{n} day(s) left', dueOn: 'due {d}', dueAtKm: 'at {n} km',
    addVehicle: 'Add vehicle', vehicleName: 'Vehicle name *', vehicleType: 'Type *', brand: 'Brand / Model',
    plate: 'Number plate', purchaseDate: 'Purchase date', currentOdo: 'Current odometer (km) *',
    saveVehicle: 'Save vehicle', yourVehicles: 'Your vehicles',
    addService: 'Add service', noVehicleHint: 'Add a vehicle first, then log services for it.',
    serviceVehicle: 'Vehicle *', serviceDate: 'Date *', serviceOdo: 'Odometer (km) *', serviceType: 'Service type *',
    workshop: 'Workshop / garage', cost: 'Cost (\u09f3) *', dueKm: 'Next service at (km)', dueMonths: 'Next service in (months)',
    notes: 'Notes', saveService: 'Save service',
    historyTitle: 'Service history', printHistory: 'Print history', filterVehicle: 'Show',
    thDate: 'Date', thVehicle: 'Vehicle', thType: 'Type', thOdo: 'Odo (km)', thCost: 'Cost', thDue: 'Next due',
    allVehicles: 'All vehicles',
    exportTitle: 'Export / Import', exportHint: 'Export downloads a JSON file with all vehicles and services. Import replaces all current data.',
    exportBtn: 'Export JSON', importLabel: 'Import JSON (paste or choose a file)', chooseFile: 'Choose file', importBtn: 'Import JSON',
    importOk: 'Data imported successfully.',
    eraseTitle: 'Erase all data', eraseHint: 'This permanently deletes every vehicle and service stored in this browser.',
    eraseLabel: 'Type DELETE to confirm', eraseBtn: 'Erase everything',
    footerNote: 'Offline personal tracker. Your data stays in this browser only. Service intervals are your own records \u2014 always follow your vehicle manual and your mechanic\'s advice.',
    deleteBtn: 'Delete', updateOdo: 'Update', odoLabel: 'Odo (km)',
    lastService: 'Last service', totalSpent: 'Total', servicesCount: '{n} service(s)',
    confirmDeleteVehicle: 'Delete this vehicle and ALL its services? This cannot be undone.',
    confirmDeleteService: 'Delete this service record?',
    err_name_required: 'Please enter a name.',
    err_name_too_long: 'Name is too long (max 60 characters).',
    err_bad_type: 'Please choose a valid type.',
    err_bad_odo: 'Please enter a valid odometer reading (whole km).',
    err_bad_brand: 'Brand is too long (max 60 characters).',
    err_bad_plate: 'Plate is too long (max 20 characters).',
    err_bad_purchase_date: 'Please enter a valid purchase date.',
    err_purchase_date_future: 'Purchase date cannot be in the future.',
    err_not_an_object: 'Invalid data.',
    err_bad_vehicle: 'Please choose a vehicle.',
    err_bad_date: 'Please enter a valid date.',
    err_date_future: 'Date cannot be in the future.',
    err_odo_decreased: 'Odometer cannot be lower than the last recorded reading.',
    err_odo_too_high: 'Odometer cannot be higher than a later service reading.',
    err_bad_cost: 'Please enter a valid cost greater than 0.',
    err_bad_workshop: 'Workshop name is too long (max 80 characters).',
    err_bad_notes: 'Notes are too long (max 300 characters).',
    err_bad_due_km: 'Next-service km must be higher than this reading.',
    err_bad_due_months: 'Months must be between 1 and 36.',
    err_bad_vehicle_id: 'Import file has a bad vehicle id.',
    err_bad_service_id: 'Import file has a bad service id.',
    err_bad_version: 'Import file version is not supported.',
    err_bad_shape: 'Import file has the wrong shape.',
    err_vehicle: 'Import file has an invalid vehicle.',
    err_service: 'Import file has an invalid service.',
    err_import_parse: 'Could not read this file \u2014 it is not valid JSON.',
    err_import_invalid: 'Import file failed validation \u2014 nothing was changed.',
    type_bike: 'Bike', type_car: 'Car', type_cng: 'CNG / Auto', type_microbus: 'Microbus', type_other: 'Other',
    st_engine_oil: 'Engine oil', st_oil_filter: 'Oil filter', st_air_filter: 'Air filter', st_brake_pad: 'Brake pad',
    st_chain: 'Chain', st_tyre: 'Tyre', st_battery: 'Battery', st_clutch: 'Clutch',
    st_general: 'General service', st_repair: 'Repair', st_other: 'Other',
  },
  bn: {
    appTitle: '\u09ad\u09c7\u09b9\u09bf\u0995\u09b2 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09ac\u09bf\u09a1\u09bf',
    appSubtitle: '\u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09be\u0987\u0995 \u09ac\u09be \u0997\u09be\u09a1\u09bc\u09bf\u09b0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8, \u0996\u09b0\u099a \u0993 \u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09b9\u09bf\u09b8\u09be\u09ac \u09b0\u09be\u0996\u09c1\u09a8',
    tabDashboard: '\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1', tabVehicles: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8', tabServices: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8', tabData: '\u09a1\u09c7\u099f\u09be',
    statTotal: '\u09ae\u09cb\u099f \u0996\u09b0\u099a (\u09b8\u09ac \u09b8\u09ae\u09af\u09bc)', statYear: '\u098f\u0987 \u09ac\u099b\u09b0\u09c7\u09b0 \u0996\u09b0\u099a', statServices: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09b8\u0982\u0996\u09cd\u09af\u09be', statVehicles: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8',
    upcomingTitle: '\u0986\u09b8\u09a8\u09cd\u09a8 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8', perVehicleTitle: '\u09aa\u09cd\u09b0\u09a4\u09bf \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8\u09c7 \u0996\u09b0\u099a', recentTitle: '\u09b8\u09be\u09ae\u09cd\u09aa\u09cd\u09b0\u09a4\u09bf\u0995 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8',
    noDues: '\u0995\u09cb\u09a8\u09cb \u0986\u09b8\u09a8\u09cd\u09a8 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09a8\u09c7\u0987 \u2014 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09b2\u09c7\u0996\u09be\u09b0 \u09b8\u09ae\u09af\u09bc \u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u0995\u09bf\u09ae\u09bf \u09ac\u09be \u09ae\u09be\u09b8 \u09a6\u09bf\u09a8\u0964',
    noServicesYet: '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09a8\u09c7\u0987 \u2014 \u0989\u09aa\u09b0\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    noVehiclesYet: '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09a8\u09c7\u0987 \u2014 \u0989\u09aa\u09b0\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    overdue: '\u09ae\u09c7\u09af\u09bc\u09be\u09a6\u09cb\u09a4\u09cd\u09a4\u09c0\u09b0\u09cd\u09a3', dueSoon: '\u09b6\u09c0\u0998\u09cd\u09b0\u0987 \u09a6\u09b0\u0995\u09be\u09b0', okDue: '\u09a0\u09bf\u0995 \u0986\u099b\u09c7', noDue: '\u09a8\u09bf\u09b0\u09cd\u09a7\u09be\u09b0\u09bf\u09a4 \u09a8\u09af\u09bc',
    kmLeft: '{n} \u0995\u09bf\u09ae\u09bf \u09ac\u09be\u0995\u09bf', daysLeft: '{n} \u09a6\u09bf\u09a8 \u09ac\u09be\u0995\u09bf', dueOn: '{d} \u09a4\u09be\u09b0\u09bf\u0996\u09c7', dueAtKm: '{n} \u0995\u09bf\u09ae\u09bf\u09a4\u09c7',
    addVehicle: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8', vehicleName: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8\u09c7\u09b0 \u09a8\u09be\u09ae *', vehicleType: '\u09a7\u09b0\u09a8 *', brand: '\u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1 / \u09ae\u09a1\u09c7\u09b2',
    plate: '\u09a8\u09ae\u09cd\u09ac\u09b0 \u09aa\u09cd\u09b2\u09c7\u099f', purchaseDate: '\u0995\u09c7\u09a8\u09be\u09b0 \u09a4\u09be\u09b0\u09bf\u0996', currentOdo: '\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u0985\u09a1\u09cb\u09ae\u09bf\u099f\u09be\u09b0 (\u0995\u09bf\u09ae\u09bf) *',
    saveVehicle: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8', yourVehicles: '\u0986\u09aa\u09a8\u09be\u09b0 \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8',
    addService: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8', noVehicleHint: '\u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u098f\u0995\u099f\u09bf \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8, \u09a4\u09be\u09b0\u09aa\u09b0 \u09a4\u09be\u09b0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09b2\u09bf\u0996\u09c1\u09a8\u0964',
    serviceVehicle: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 *', serviceDate: '\u09a4\u09be\u09b0\u09bf\u0996 *', serviceOdo: '\u0985\u09a1\u09cb\u09ae\u09bf\u099f\u09be\u09b0 (\u0995\u09bf\u09ae\u09bf) *', serviceType: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09a7\u09b0\u09a8 *',
    workshop: '\u0993\u09af\u09bc\u09be\u09b0\u09cd\u0995\u09b6\u09aa / \u0997\u09cd\u09af\u09be\u09b0\u09c7\u099c', cost: '\u0996\u09b0\u099a (\u09f3) *', dueKm: '\u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 (\u0995\u09bf\u09ae\u09bf)', dueMonths: '\u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 (\u09ae\u09be\u09b8 \u09aa\u09b0)',
    notes: '\u09ae\u09a8\u09cd\u09a4\u09ac\u09cd\u09af', saveService: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8',
    historyTitle: '\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u0987\u09a4\u09bf\u09b9\u09be\u09b8', printHistory: '\u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09aa\u09cd\u09b0\u09bf\u09a8\u09cd\u099f \u0995\u09b0\u09c1\u09a8', filterVehicle: '\u09a6\u09c7\u0996\u09be\u09a8',
    thDate: '\u09a4\u09be\u09b0\u09bf\u0996', thVehicle: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8', thType: '\u09a7\u09b0\u09a8', thOdo: '\u0985\u09a1\u09cb (\u0995\u09bf\u09ae\u09bf)', thCost: '\u0996\u09b0\u099a', thDue: '\u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8',
    allVehicles: '\u09b8\u09ac \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8',
    exportTitle: '\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f / \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f', exportHint: '\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u0995\u09b0\u09b2\u09c7 \u09b8\u09ac \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u0993 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 JSON \u09ab\u09be\u0987\u09b2 \u09a1\u09be\u0989\u09a8\u09b2\u09cb\u09a1 \u09b9\u09ac\u09c7\u0964 \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u0995\u09b0\u09b2\u09c7 \u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ac\u09a6\u09b2\u09c7 \u09af\u09be\u09ac\u09c7\u0964',
    exportBtn: 'JSON \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f', importLabel: 'JSON \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f (\u09aa\u09c7\u09b8\u09cd\u099f \u0995\u09b0\u09c1\u09a8 \u09ac\u09be \u09ab\u09be\u0987\u09b2 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8)', chooseFile: '\u09ab\u09be\u0987\u09b2 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8', importBtn: 'JSON \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f',
    importOk: '\u09a1\u09c7\u099f\u09be \u09b8\u09ab\u09b2\u09ad\u09be\u09ac\u09c7 \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    eraseTitle: '\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09c1\u09a8', eraseHint: '\u098f\u09a4\u09c7 \u098f\u0987 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7 \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b8\u09ac \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u0993 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09b8\u09cd\u09a5\u09be\u09af\u09bc\u09c0\u09ad\u09be\u09ac\u09c7 \u09ae\u09c1\u099b\u09c7 \u09af\u09be\u09ac\u09c7\u0964',
    eraseLabel: '\u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09a4\u09c7 DELETE \u09b2\u09bf\u0996\u09c1\u09a8', eraseBtn: '\u09b8\u09ac \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09c1\u09a8',
    footerNote: '\u0985\u09ab\u09b2\u09be\u0987\u09a8 \u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0\u0964 \u0986\u09aa\u09a8\u09be\u09b0 \u09a1\u09c7\u099f\u09be \u09b6\u09c1\u09a7\u09c1 \u098f\u0987 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7\u0987 \u09a5\u09be\u0995\u09c7\u0964 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09b8\u09ae\u09af\u09bc\u09b8\u09c2\u099a\u09bf \u0986\u09aa\u09a8\u09be\u09b0 \u09a8\u09bf\u099c\u09c7\u09b0 \u09b0\u09c7\u0995\u09b0\u09cd\u09a1 \u2014 \u09b8\u09ac\u09b8\u09ae\u09af\u09bc \u0997\u09be\u09a1\u09bc\u09bf\u09b0 \u09ae\u09cd\u09af\u09be\u09a8\u09c1\u09af\u09bc\u09be\u09b2 \u0993 \u09ae\u09c7\u0995\u09be\u09a8\u09bf\u0995\u09c7\u09b0 \u09aa\u09b0\u09be\u09ae\u09b0\u09cd\u09b6 \u09ae\u09c7\u09a8\u09c7 \u099a\u09b2\u09c1\u09a8\u0964',
    deleteBtn: '\u09ae\u09c1\u099b\u09c1\u09a8', updateOdo: '\u0986\u09aa\u09a1\u09c7\u099f', odoLabel: '\u0985\u09a1\u09cb (\u0995\u09bf\u09ae\u09bf)',
    lastService: '\u09b6\u09c7\u09b7 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8', totalSpent: '\u09ae\u09cb\u099f', servicesCount: '{n}\u099f\u09bf \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8',
    confirmDeleteVehicle: '\u098f\u0987 \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u0993 \u09a4\u09be\u09b0 \u09b8\u09ac \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09ac\u09c7\u09a8? \u098f\u099f\u09bf \u09ab\u09c7\u09b0\u09be\u09a8\u09cb \u09af\u09be\u09ac\u09c7 \u09a8\u09be\u0964',
    confirmDeleteService: '\u098f\u0987 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09b0\u09c7\u0995\u09b0\u09cd\u09a1\u099f\u09bf \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09ac\u09c7\u09a8?',
    err_name_required: '\u09a8\u09be\u09ae \u09a6\u09bf\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    err_name_too_long: '\u09a8\u09be\u09ae \u0985\u09a8\u09c7\u0995 \u09b2\u09ae\u09cd\u09ac\u09be (\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09ec\u09e6 \u0985\u0995\u09cd\u09b7\u09b0)\u0964',
    err_bad_type: '\u09b8\u09a0\u09bf\u0995 \u09a7\u09b0\u09a8 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8\u0964',
    err_bad_odo: '\u09b8\u09a0\u09bf\u0995 \u0985\u09a1\u09cb\u09ae\u09bf\u099f\u09be\u09b0 \u09b0\u09bf\u09a1\u09bf\u0982 \u09a6\u09bf\u09a8 (\u09aa\u09c2\u09b0\u09cd\u09a3 \u0995\u09bf\u09ae\u09bf)\u0964',
    err_bad_brand: '\u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1 \u0985\u09a8\u09c7\u0995 \u09b2\u09ae\u09cd\u09ac\u09be (\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09ec\u09e6 \u0985\u0995\u09cd\u09b7\u09b0)\u0964',
    err_bad_plate: '\u09aa\u09cd\u09b2\u09c7\u099f \u0985\u09a8\u09c7\u0995 \u09b2\u09ae\u09cd\u09ac\u09be (\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09e8\u09e6 \u0985\u0995\u09cd\u09b7\u09b0)\u0964',
    err_bad_purchase_date: '\u09b8\u09a0\u09bf\u0995 \u0995\u09c7\u09a8\u09be\u09b0 \u09a4\u09be\u09b0\u09bf\u0996 \u09a6\u09bf\u09a8\u0964',
    err_purchase_date_future: '\u0995\u09c7\u09a8\u09be\u09b0 \u09a4\u09be\u09b0\u09bf\u0996 \u09ad\u09ac\u09bf\u09b7\u09cd\u09af\u09a4\u09c7 \u09b9\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7 \u09a8\u09be\u0964',
    err_not_an_object: '\u09a1\u09c7\u099f\u09be \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_bad_vehicle: '\u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8\u0964',
    err_bad_date: '\u09b8\u09a0\u09bf\u0995 \u09a4\u09be\u09b0\u09bf\u0996 \u09a6\u09bf\u09a8\u0964',
    err_date_future: '\u09ad\u09ac\u09bf\u09b7\u09cd\u09af\u09a4\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996 \u09a6\u09c7\u0993\u09af\u09bc\u09be \u09af\u09be\u09ac\u09c7 \u09a8\u09be\u0964',
    err_odo_decreased: '\u0985\u09a1\u09cb\u09ae\u09bf\u099f\u09be\u09b0 \u0986\u0997\u09c7\u09b0 \u09b0\u09bf\u09a1\u09bf\u0982\u09af\u09bc\u09c7\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u0995\u09ae \u09b9\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7 \u09a8\u09be\u0964',
    err_odo_too_high: '\u0985\u09a1\u09cb\u09ae\u09bf\u099f\u09be\u09b0 \u09aa\u09b0\u09c7\u09b0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u09b0\u09bf\u09a1\u09bf\u0982\u09af\u09bc\u09c7\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u09ac\u09c7\u09b6\u09bf \u09b9\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7 \u09a8\u09be\u0964',
    err_bad_cost: '\u09b8\u09a0\u09bf\u0995 \u0996\u09b0\u099a \u09a6\u09bf\u09a8 (\u09e6-\u098f\u09b0 \u09ac\u09c7\u09b6\u09bf)\u0964',
    err_bad_workshop: '\u0993\u09af\u09bc\u09be\u09b0\u09cd\u0995\u09b6\u09aa\u09c7\u09b0 \u09a8\u09be\u09ae \u0985\u09a8\u09c7\u0995 \u09b2\u09ae\u09cd\u09ac\u09be (\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09ee\u09e6 \u0985\u0995\u09cd\u09b7\u09b0)\u0964',
    err_bad_notes: '\u09ae\u09a8\u09cd\u09a4\u09ac\u09cd\u09af \u0985\u09a8\u09c7\u0995 \u09b2\u09ae\u09cd\u09ac\u09be (\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09e9\u09e6\u09e6 \u0985\u0995\u09cd\u09b7\u09b0)\u0964',
    err_bad_due_km: '\u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u0995\u09bf\u09ae\u09bf \u098f\u0987 \u09b0\u09bf\u09a1\u09bf\u0982\u09af\u09bc\u09c7\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u09ac\u09c7\u09b6\u09bf \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    err_bad_due_months: '\u09ae\u09be\u09b8 \u09e7\u2013\u09e9\u09ec \u098f\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    err_bad_vehicle_id: '\u09ab\u09be\u0987\u09b2\u09c7 \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8\u09c7\u09b0 \u0986\u0987\u09a1\u09bf \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_bad_service_id: '\u09ab\u09be\u0987\u09b2\u09c7 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8\u09c7\u09b0 \u0986\u0987\u09a1\u09bf \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_bad_version: '\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u09b8\u0982\u09b8\u09cd\u0995\u09b0\u09a3 \u09b8\u09ae\u09b0\u09cd\u09a5\u09bf\u09a4 \u09a8\u09af\u09bc\u0964',
    err_bad_shape: '\u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u0997\u09a0\u09a8 \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_vehicle: '\u09ab\u09be\u0987\u09b2\u09c7 \u098f\u0995\u099f\u09bf \u09af\u09be\u09a8\u09ac\u09be\u09b9\u09a8 \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_service: '\u09ab\u09be\u0987\u09b2\u09c7 \u098f\u0995\u099f\u09bf \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09b8\u09a0\u09bf\u0995 \u09a8\u09af\u09bc\u0964',
    err_import_parse: '\u09ab\u09be\u0987\u09b2\u099f\u09bf \u09aa\u09a1\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf \u2014 \u098f\u099f\u09bf \u09b8\u09a0\u09bf\u0995 JSON \u09a8\u09af\u09bc\u0964',
    err_import_invalid: '\u09ab\u09be\u0987\u09b2 \u09af\u09be\u099a\u09be\u0987\u09af\u09bc\u09c7 \u09ac\u09cd\u09af\u09b0\u09cd\u09a5 \u2014 \u0995\u09bf\u099b\u09c1\u0987 \u09ac\u09a6\u09b2\u09be\u09a8\u09cb \u09b9\u09af\u09bc\u09a8\u09bf\u0964',
    type_bike: '\u09ac\u09be\u0987\u0995', type_car: '\u0997\u09be\u09a1\u09bc\u09bf', type_cng: '\u09b8\u09bf\u098f\u09a8\u099c\u09bf / \u0985\u099f\u09cb', type_microbus: '\u09ae\u09be\u0987\u0995\u09cd\u09b0\u09cb\u09ac\u09be\u09b8', type_other: '\u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af',
    st_engine_oil: '\u0987\u099e\u09cd\u099c\u09bf\u09a8 \u0985\u09af\u09bc\u09c7\u09b2', st_oil_filter: '\u0985\u09af\u09bc\u09c7\u09b2 \u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0', st_air_filter: '\u098f\u09af\u09bc\u09be\u09b0 \u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0', st_brake_pad: '\u09ac\u09cd\u09b0\u09c7\u0995 \u09aa\u09cd\u09af\u09be\u09a1',
    st_chain: '\u099a\u09c7\u0987\u09a8', st_tyre: '\u099f\u09be\u09af\u09bc\u09be\u09b0', st_battery: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf', st_clutch: '\u0995\u09cd\u09b2\u09be\u099a',
    st_general: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8', st_repair: '\u09ae\u09c7\u09b0\u09be\u09ae\u09a4', st_other: '\u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af',
  },
};

let lang = localStorage.getItem('vsbd_lang') || 'en';
if (lang !== 'en' && lang !== 'bn') lang = 'en';
let state = loadState();
let activeTab = 'dashboard';
let historyFilter = 'all';

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return VSBD.emptyState();
    const obj = JSON.parse(raw);
    const r = VSBD.validateImport(obj);
    return r.ok ? { version: 1, vehicles: obj.vehicles, services: obj.services } : VSBD.emptyState();
  } catch (e) { return VSBD.emptyState(); }
}
function saveState() {
  localStorage.setItem(STORE_KEY, VSBD.exportData(state));
}
function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', String(vars[k]));
  return s;
}
function num(n) { return lang === 'bn' ? VSBD.toBnDigits(String(n)) : String(n); }
function money(p) { return VSBD.fmtMoney(p, lang); }
function km(n) { return VSBD.fmtKm(n, lang); }
function dstr(s) { return lang === 'bn' ? VSBD.toBnDigits(s) : s; }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function today() { return VSBD.todayStr(ASOF); }
function errMsg(code) {
  if (!code) return '';
  const key = 'err_' + code.replace(/^vehicle:/, '').replace(/^service:/, '');
  return t(key);
}
function vehicleName(id) {
  const v = state.vehicles.find((x) => x.id === id);
  return v ? v.name : '?';
}
function typeLabel(prefix, code) {
  return t(prefix + code.replace(/-/g, '_'));
}

/* ---------- i18n / tabs ---------- */
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang][key] !== undefined) el.textContent = t(key);
  });
  document.getElementById('langBtn').textContent = lang === 'en' ? '\u09ac\u09be\u0982\u09b2\u09be' : 'English';
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  buildSelects();
  renderAll();
}
document.getElementById('langBtn').addEventListener('click', () => {
  lang = lang === 'en' ? 'bn' : 'en';
  localStorage.setItem('vsbd_lang', lang);
  applyLang();
});
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + activeTab));
    renderAll();
  });
});

function buildSelects() {
  const vt = document.getElementById('vType');
  vt.innerHTML = VSBD.VEHICLE_TYPES.map((x) => '<option value="' + x + '">' + esc(typeLabel('type_', x)) + '</option>').join('');
  const st = document.getElementById('sType');
  st.innerHTML = VSBD.SERVICE_TYPES.map((x) => '<option value="' + x + '">' + esc(typeLabel('st_', x)) + '</option>').join('');
  const sv = document.getElementById('sVehicle');
  sv.innerHTML = state.vehicles.map((v) => '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>').join('');
  const hf = document.getElementById('historyFilter');
  hf.innerHTML = '<option value="all">' + esc(t('allVehicles')) + '</option>' +
    state.vehicles.map((v) => '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>').join('');
  hf.value = historyFilter;
  document.getElementById('noVehicleHint').hidden = state.vehicles.length > 0;
  document.getElementById('sDate').value = today();
}

/* ---------- render ---------- */
function renderAll() {
  renderDashboard();
  renderVehicles();
  renderServices();
}
function statCard(label, value, sub) {
  return '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + '</div>' +
    (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>';
}
function dueBadge(due) {
  if (due.status === 'overdue') return '<span class="badge overdue">' + esc(t('overdue')) + '</span>';
  if (due.status === 'soon') return '<span class="badge soon">' + esc(t('dueSoon')) + '</span>';
  if (due.status === 'ok') return '<span class="badge ok">' + esc(t('okDue')) + '</span>';
  return '<span class="badge none">' + esc(t('noDue')) + '</span>';
}
function dueText(due) {
  const parts = [];
  if (due.dueKm !== null) {
    parts.push(due.kmLeft <= 0 ? t('dueAtKm', { n: km(due.dueKm) }) : t('kmLeft', { n: km(due.kmLeft) }));
  }
  if (due.dueDate !== null) {
    parts.push(due.daysLeft < 0 ? t('dueOn', { d: dstr(due.dueDate) }) : t('daysLeft', { n: num(due.daysLeft) }) + ' \u00b7 ' + t('dueOn', { d: dstr(due.dueDate) }));
  }
  return parts.join(' \u00b7 ');
}
function renderDashboard() {
  const s = VSBD.summarize(state, today());
  const year = today().slice(0, 4);
  document.getElementById('statsGrid').innerHTML =
    statCard(t('statTotal'), money(s.totalPaisa)) +
    statCard(t('statYear'), money(s.yearPaisa), dstr(year)) +
    statCard(t('statServices'), num(s.serviceCount)) +
    statCard(t('statVehicles'), num(s.vehicleCount));
  const duesEl = document.getElementById('duesList');
  if (s.dues.length === 0) {
    duesEl.innerHTML = '<p class="empty">' + esc(t('noDues')) + '</p>';
  } else {
    duesEl.innerHTML = s.dues.map((d) =>
      '<div class="due-row"><div class="who"><div class="name">' + esc(d.vehicle.name) + '</div>' +
      '<div class="meta">' + esc(typeLabel('st_', d.service.type)) + ' \u00b7 ' + esc(dueText(d.due)) + '</div></div>' +
      dueBadge(d.due) + '</div>').join('');
  }
  const pvEl = document.getElementById('perVehicleList');
  if (s.perVehicle.length === 0) {
    pvEl.innerHTML = '<p class="empty">' + esc(t('noVehiclesYet')) + '</p>';
  } else {
    const max = Math.max.apply(null, s.perVehicle.map((x) => x.total).concat([1]));
    pvEl.innerHTML = s.perVehicle.map((x) =>
      '<div class="pv-row"><div class="top"><span class="name">' + esc(x.vehicle.name) + '</span>' +
      '<span>' + esc(money(x.total)) + ' \u00b7 ' + esc(t('servicesCount', { n: num(x.count) })) + '</span></div>' +
      '<div class="pv-bar"><span style="width:' + Math.round((x.total / max) * 100) + '%"></span></div></div>').join('');
  }
  const rcEl = document.getElementById('recentList');
  if (s.recent.length === 0) {
    rcEl.innerHTML = '<p class="empty">' + esc(t('noServicesYet')) + '</p>';
  } else {
    rcEl.innerHTML = s.recent.map((sv) =>
      '<div class="recent-row"><div class="who"><div class="name">' + esc(vehicleName(sv.vehicleId)) + ' \u2014 ' + esc(typeLabel('st_', sv.type)) + '</div>' +
      '<div class="meta">' + esc(dstr(sv.date)) + ' \u00b7 ' + esc(km(sv.odo)) + ' km' + (sv.workshop ? ' \u00b7 ' + esc(sv.workshop) : '') + '</div></div>' +
      '<strong>' + esc(money(sv.costPaisa)) + '</strong></div>').join('');
  }
}
function renderVehicles() {
  const el = document.getElementById('vehicleList');
  if (state.vehicles.length === 0) {
    el.innerHTML = '<p class="empty">' + esc(t('noVehiclesYet')) + '</p>';
    return;
  }
  el.innerHTML = state.vehicles.map((v) => {
    const mine = state.services.filter((s) => s.vehicleId === v.id);
    const total = mine.reduce((a, s) => a + s.costPaisa, 0);
    const last = mine.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return '<div class="vehicle-row"><div class="who"><div class="name">' + esc(v.name) + ' <span class="meta">(' + esc(typeLabel('type_', v.type)) + ')</span></div>' +
      '<div class="meta">' + [v.brand, v.plate, v.purchaseDate ? dstr(v.purchaseDate) : ''].filter(Boolean).map(esc).join(' \u00b7 ') + '</div>' +
      '<div class="meta">' + esc(t('totalSpent')) + ': ' + esc(money(total)) + ' \u00b7 ' + esc(t('servicesCount', { n: num(mine.length) })) +
      (last ? ' \u00b7 ' + esc(t('lastService')) + ': ' + esc(dstr(last.date)) : '') + '</div></div>' +
      '<div class="vehicle-actions"><label><span class="sr-only">' + esc(t('odoLabel')) + '</span>' +
      '<input type="text" inputmode="numeric" data-odo-for="' + esc(v.id) + '" value="' + esc(km(v.odo)) + '" aria-label="' + esc(t('odoLabel')) + '"></label>' +
      '<button type="button" class="btn small" data-update-odo="' + esc(v.id) + '">' + esc(t('updateOdo')) + '</button>' +
      '<button type="button" class="btn small" data-del-vehicle="' + esc(v.id) + '">' + esc(t('deleteBtn')) + '</button></div></div>';
  }).join('');
  el.querySelectorAll('[data-update-odo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-update-odo');
      const input = el.querySelector('[data-odo-for="' + id + '"]');
      const v = state.vehicles.find((x) => x.id === id);
      const parsed = VSBD.parseKm(input.value);
      const lastOdo = VSBD.lastServiceOdo(state, id);
      if (parsed === null || (lastOdo !== null && parsed < lastOdo)) {
        input.style.borderColor = 'var(--red)';
        return;
      }
      input.style.borderColor = '';
      v.odo = parsed;
      saveState();
      renderAll();
    });
  });
  el.querySelectorAll('[data-del-vehicle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!window.confirm(t('confirmDeleteVehicle'))) return;
      const id = btn.getAttribute('data-del-vehicle');
      state.vehicles = state.vehicles.filter((x) => x.id !== id);
      state.services = state.services.filter((s) => s.vehicleId !== id);
      saveState();
      buildSelects();
      renderAll();
    });
  });
}
function renderServices() {
  const body = document.getElementById('historyBody');
  let rows = state.services.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (historyFilter !== 'all') rows = rows.filter((s) => s.vehicleId === historyFilter);
  document.getElementById('historyEmpty').hidden = rows.length > 0;
  body.innerHTML = rows.map((s) => {
    const due = VSBD.computeDue(s, (state.vehicles.find((v) => v.id === s.vehicleId) || { odo: 0 }).odo, today());
    const dueCell = due.status === 'none' ? '<span class="badge none">' + esc(t('noDue')) + '</span>'
      : dueBadge(due) + '<span class="sub">' + esc(dueText(due)) + '</span>';
    return '<tr><td>' + esc(dstr(s.date)) + '</td><td>' + esc(vehicleName(s.vehicleId)) + '</td>' +
      '<td>' + esc(typeLabel('st_', s.type)) + (s.workshop ? '<span class="sub">' + esc(s.workshop) + '</span>' : '') +
      (s.notes ? '<span class="sub">' + esc(s.notes) + '</span>' : '') + '</td>' +
      '<td>' + esc(km(s.odo)) + '</td><td>' + esc(money(s.costPaisa)) + '</td><td>' + dueCell + '</td>' +
      '<td><button type="button" class="btn small" data-del-service="' + esc(s.id) + '">' + esc(t('deleteBtn')) + '</button></td></tr>';
  }).join('');
  body.querySelectorAll('[data-del-service]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!window.confirm(t('confirmDeleteService'))) return;
      state.services = state.services.filter((s) => s.id !== btn.getAttribute('data-del-service'));
      saveState();
      renderAll();
    });
  });
}

/* ---------- forms ---------- */
function setErr(id, code) {
  const el = document.getElementById(id);
  if (el) el.textContent = code ? errMsg(code) : '';
}
document.getElementById('vehicleForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = {
    id: VSBD.uid(),
    name: document.getElementById('vName').value.trim(),
    type: document.getElementById('vType').value,
    brand: document.getElementById('vBrand').value.trim(),
    plate: document.getElementById('vPlate').value.trim(),
    purchaseDate: document.getElementById('vPurchase').value,
    odo: VSBD.parseKm(document.getElementById('vOdo').value),
  };
  if (v.odo === null) v.odo = -1; // force bad-odo through validator
  const r = VSBD.validateVehicle(v, today());
  ['vName', 'vType', 'vPurchase', 'vOdo'].forEach((x) => setErr('err-' + x, ''));
  if (!r.ok) {
    const map = { 'name-required': 'vName', 'name-too-long': 'vName', 'bad-type': 'vType', 'bad-odo': 'vOdo', 'bad-purchase-date': 'vPurchase', 'purchase-date-future': 'vPurchase' };
    setErr('err-' + (map[r.error] || 'vName'), r.error);
    return;
  }
  if (!v.brand) delete v.brand;
  if (!v.plate) delete v.plate;
  if (!v.purchaseDate) delete v.purchaseDate;
  state.vehicles.push(v);
  saveState();
  e.target.reset();
  buildSelects();
  renderAll();
});
document.getElementById('serviceForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const dueKmRaw = document.getElementById('sDueKm').value.trim();
  const dueMoRaw = document.getElementById('sDueMonths').value.trim();
  const s = {
    id: VSBD.uid(),
    vehicleId: document.getElementById('sVehicle').value,
    date: document.getElementById('sDate').value,
    odo: VSBD.parseKm(document.getElementById('sOdo').value),
    type: document.getElementById('sType').value,
    workshop: document.getElementById('sWorkshop').value.trim(),
    costPaisa: VSBD.parseAmount(document.getElementById('sCost').value),
    notes: document.getElementById('sNotes').value.trim(),
    dueKm: dueKmRaw === '' ? null : VSBD.parseKm(dueKmRaw),
    dueMonths: dueMoRaw === '' ? null : Number(VSBD.fromBnDigits(dueMoRaw).replace(/[, ]/g, '')),
  };
  if (s.odo === null) s.odo = -1;
  if (s.costPaisa === null) s.costPaisa = 0;
  if (s.dueKm === null && dueKmRaw !== '') s.dueKm = -1;
  if (dueMoRaw !== '' && !Number.isSafeInteger(s.dueMonths)) s.dueMonths = 0;
  const r = VSBD.validateService(s, state, today());
  ['sVehicle', 'sDate', 'sOdo', 'sType', 'sCost', 'sDueKm', 'sDueMonths'].forEach((x) => setErr('err-' + x, ''));
  if (!r.ok) {
    const map = { 'bad-vehicle': 'sVehicle', 'bad-date': 'sDate', 'date-future': 'sDate', 'bad-odo': 'sOdo', 'odo-decreased': 'sOdo', 'odo-too-high': 'sOdo', 'bad-type': 'sType', 'bad-cost': 'sCost', 'bad-due-km': 'sDueKm', 'bad-due-months': 'sDueMonths' };
    setErr('err-' + (map[r.error] || 'sCost'), r.error);
    return;
  }
  if (!s.workshop) delete s.workshop;
  if (!s.notes) delete s.notes;
  if (s.dueKm === null) delete s.dueKm;
  if (s.dueMonths === null) delete s.dueMonths;
  state.services.push(s);
  const v = state.vehicles.find((x) => x.id === s.vehicleId);
  if (v && s.odo > v.odo) v.odo = s.odo;
  saveState();
  e.target.reset();
  document.getElementById('sDate').value = today();
  buildSelects();
  renderAll();
});
document.getElementById('historyFilter').addEventListener('change', (e) => {
  historyFilter = e.target.value;
  renderServices();
});
document.getElementById('printBtn').addEventListener('click', () => window.print());

/* ---------- data tab ---------- */
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([VSBD.exportData(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vehicle-service-bd.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
document.getElementById('importFileBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('importText').value = String(reader.result || ''); };
  reader.readAsText(f);
});
document.getElementById('importBtn').addEventListener('click', () => {
  const raw = document.getElementById('importText').value;
  let obj;
  try { obj = JSON.parse(raw); }
  catch (err) { setErr('err-import', 'import_parse'); document.getElementById('importOk').hidden = true; return; }
  const r = VSBD.validateImport(obj);
  if (!r.ok) {
    setErr('err-import', r.error && r.error.indexOf('service:') === 0 ? 'service' : (r.error && r.error.indexOf('vehicle:') === 0 ? 'vehicle' : r.error));
    document.getElementById('importOk').hidden = true;
    return;
  }
  state = { version: 1, vehicles: obj.vehicles, services: obj.services };
  saveState();
  setErr('err-import', '');
  document.getElementById('importOk').hidden = false;
  buildSelects();
  renderAll();
});
document.getElementById('eraseText').addEventListener('input', (e) => {
  document.getElementById('eraseBtn').disabled = e.target.value.trim() !== 'DELETE';
});
document.getElementById('eraseBtn').addEventListener('click', () => {
  if (document.getElementById('eraseText').value.trim() !== 'DELETE') return;
  state = VSBD.emptyState();
  saveState();
  document.getElementById('eraseText').value = '';
  document.getElementById('eraseBtn').disabled = true;
  buildSelects();
  renderAll();
});

/* ---------- init ---------- */
applyLang();
