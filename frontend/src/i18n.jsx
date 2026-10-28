import { createContext, useContext, useEffect, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
  { code: 'ps', label: 'پښتو', dir: 'rtl' },
];

// Static UI strings. Keys fall back to English when a translation is missing.
// User-entered data (property titles, names, notes) is never translated.
const STRINGS = {
  // Chrome
  dashboard: { en: 'Dashboard', fa: 'داشبورد', ps: 'ډشبورډ' },
  myLandlords: { en: 'My Landlords', fa: 'موجرهای من', ps: 'زما مالکان' },
  properties: { en: 'Properties', fa: 'املاک', ps: 'جایدادونه' },
  inquiries: { en: 'Inquiries', fa: 'استعلام‌ها', ps: 'پوښتنې' },
  agreements: { en: 'Agreements', fa: 'توافق‌نامه‌ها', ps: 'هوکړه‌لیکونه' },
  commissions: { en: 'Commissions', fa: 'کمیسیون‌ها', ps: 'کمېشنونه' },
  logout: { en: 'Logout', fa: 'خروج', ps: 'وتل' },
  back: { en: 'Back', fa: 'بازگشت', ps: 'شاته' },
  loading: { en: 'Loading…', fa: 'در حال بارگذاری…', ps: 'بارېدل…' },

  // Auth
  loginTitle: { en: 'Login to RentAasan', fa: 'ورود به RentAasan', ps: 'RentAasan ته ننوتل' },
  login: { en: 'Login', fa: 'ورود', ps: 'ننوتل' },
  registerTitle: { en: 'Create your RentAasan account', fa: 'حساب RentAasan خود را بسازید', ps: 'خپل RentAasan حساب جوړ کړئ' },
  register: { en: 'Register', fa: 'ثبت‌نام', ps: 'راجسټرېدل' },
  email: { en: 'Email', fa: 'ایمیل', ps: 'بریښنالیک' },
  password: { en: 'Password', fa: 'رمز عبور', ps: 'پټنوم' },
  name: { en: 'Name', fa: 'نام', ps: 'نوم' },
  phone: { en: 'Phone', fa: 'تلفن', ps: 'ټلیفون' },
  role: { en: 'Role', fa: 'نقش', ps: 'رول' },
  roleLandlord: { en: 'Landlord', fa: 'موجر', ps: 'مالک' },
  roleTenant: { en: 'Tenant', fa: 'مستأجر', ps: 'کرایه نیونکی' },
  roleDealer: { en: 'Property Dealer', fa: 'مشاور املاک', ps: 'د جایداد ډیلر' },
  atLeast6: { en: 'At least 6 characters', fa: 'حداقل ۶ کاراکتر', ps: 'لږ تر لږه ۶ توري' },
  noAccount: { en: 'No account?', fa: 'حساب ندارید؟', ps: 'حساب نه لرئ؟' },
  haveAccount: { en: 'Already have an account?', fa: 'قبلاً حساب ساخته‌اید؟', ps: 'له مخکې حساب لرئ؟' },

  // Common
  save: { en: 'Save', fa: 'ذخیره', ps: 'خوندي کول' },
  saving: { en: 'Saving...', fa: 'در حال ذخیره…', ps: 'خوندي کېږي…' },
  submitting: { en: 'Submitting...', fa: 'در حال ارسال…', ps: 'لېږل کېږي…' },
  logging: { en: 'Logging...', fa: 'در حال ثبت…', ps: 'ثبتېږي…' },
  delete: { en: 'Delete', fa: 'حذف', ps: 'ړنګول' },
  downloadPdf: { en: 'Download PDF', fa: 'دانلود PDF', ps: 'PDF ښکته کول' },
  select: { en: 'Select…', fa: 'انتخاب کنید…', ps: 'وټاکئ…' },
  all: { en: 'All', fa: 'همه', ps: 'ټول' },
  allProperties: { en: 'All properties', fa: 'همه املاک', ps: 'ټول جایدادونه' },
  allLandlords: { en: 'All landlords', fa: 'همه موجرها', ps: 'ټول مالکان' },
  yes: { en: 'Yes', fa: 'بله', ps: 'هو' },
  no: { en: 'No', fa: 'خیر', ps: 'نه' },
  vacant: { en: 'Vacant', fa: 'خالی', ps: 'خالي' },
  occupied: { en: 'Occupied', fa: 'اشغال‌شده', ps: 'ډک' },
  noneYet: { en: 'None yet.', fa: 'هنوز چیزی نیست.', ps: 'تر اوسه هېڅ نشته.' },
  actions: { en: 'Actions', fa: 'اقدامات', ps: 'کړنې' },
  action: { en: 'Action', fa: 'اقدام', ps: 'کړنه' },
  status: { en: 'Status', fa: 'وضعیت', ps: 'حالت' },
  title: { en: 'Title', fa: 'عنوان', ps: 'سرلیک' },
  property: { en: 'Property', fa: 'ملک', ps: 'جایداد' },
  landlord: { en: 'Landlord', fa: 'موجر', ps: 'مالک' },
  tenant: { en: 'Tenant', fa: 'مستأجر', ps: 'کرایه نیونکی' },
  dealer: { en: 'Dealer', fa: 'مشاور', ps: 'ډیلر' },
  amount: { en: 'Amount', fa: 'مبلغ', ps: 'اندازه' },
  rent: { en: 'Rent', fa: 'اجاره', ps: 'کرایه' },
  area: { en: 'Area', fa: 'منطقه', ps: 'سیمه' },
  notes: { en: 'Notes', fa: 'یادداشت‌ها', ps: 'یادښتونه' },
  created: { en: 'Created', fa: 'ایجاد شده', ps: 'جوړ شو' },
  updated: { en: 'Updated', fa: 'به‌روز شده', ps: 'تازه شو' },
  sendInvite: { en: 'Send invite', fa: 'ارسال دعوت', ps: 'بلنه ولېږئ' },
  approve: { en: 'Approve', fa: 'تأیید', ps: 'منل' },
  reject: { en: 'Reject', fa: 'رد', ps: 'ردول' },
  revoke: { en: 'Revoke', fa: 'لغو', ps: 'لغوه کول' },
  accept: { en: 'Accept', fa: 'پذیرفتن', ps: 'منل' },
  markAsPaid: { en: 'Mark as paid', fa: 'علامت پرداخت‌شده', ps: 'ورکړل شوی وټاکئ' },
  awaitingDealer: { en: 'Awaiting dealer', fa: 'در انتظار مشاور', ps: 'ډیلر ته په تمه' },
  awaitingLandlord: { en: 'Awaiting landlord', fa: 'در انتظار موجر', ps: 'مالک ته په تمه' },

  // Statuses
  stNew: { en: 'New', fa: 'جدید', ps: 'نوی' },
  stViewing: { en: 'Viewing scheduled', fa: 'بازدید برنامه‌ریزی شده', ps: 'لیدنه ټاکل شوې' },
  stClosed: { en: 'Closed', fa: 'بسته شده', ps: 'تړل شوی' },
  stLost: { en: 'Lost', fa: 'از دست رفته', ps: 'له لاسه وتلی' },
  stPending: { en: 'Pending', fa: 'در انتظار', ps: 'په تمه' },
  stActive: { en: 'Active', fa: 'فعال', ps: 'فعال' },
  stRevoked: { en: 'Revoked', fa: 'لغو شده', ps: 'لغوه شوی' },
  stPaid: { en: 'Paid', fa: 'پرداخت شده', ps: 'ورکړل شوی' },
  stOpen: { en: 'Open', fa: 'باز', ps: 'خلاص' },
  stInProgress: { en: 'In progress', fa: 'در حال انجام', ps: 'په کار کې' },
  stResolved: { en: 'Resolved', fa: 'حل شده', ps: 'حل شوی' },
  stEnded: { en: 'Ended', fa: 'پایان یافته', ps: 'پای ته رسېدلی' },
  stOverdue: { en: 'Overdue', fa: 'سررسید گذشته', ps: 'وخت تېر شوی' },

  // Landlord dashboard
  landlordDashboard: { en: 'Landlord Dashboard', fa: 'داشبورد موجر', ps: 'د مالک ډشبورډ' },
  overview: { en: 'Overview', fa: 'نمای کلی', ps: 'لنډیز' },
  tenants: { en: 'Tenants', fa: 'مستأجران', ps: 'کرایه نیونکي' },
  complaints: { en: 'Complaints', fa: 'شکایات', ps: 'شکایتونه' },
  dealers: { en: 'Dealers', fa: 'مشاوران', ps: 'ډیلران' },
  rentReceived: { en: 'Rent received', fa: 'اجاره دریافتی', ps: 'ترلاسه شوې کرایه' },
  rentPending: { en: 'Rent pending', fa: 'اجاره معوق', ps: 'پاتې کرایه' },
  totalIncome: { en: 'Total income', fa: 'درآمد کل', ps: 'ټوله ګټه' },
  activeTenancies: { en: 'Active tenancies', fa: 'اجاره‌های فعال', ps: 'فعال کرایې' },
  openComplaints: { en: 'Open complaints', fa: 'شکایات باز', ps: 'خلاص شکایتونه' },
  addProperty: { en: 'Add property', fa: 'افزودن ملک', ps: 'جایداد اضافه کړئ' },
  monthlyRent: { en: 'Monthly rent', fa: 'اجاره ماهانه', ps: 'میاشتنۍ کرایه' },
  address: { en: 'Address', fa: 'آدرس', ps: 'پته' },
  city: { en: 'City', fa: 'شهر', ps: 'ښار' },
  type: { en: 'Type', fa: 'نوع', ps: 'ډول' },
  house: { en: 'House', fa: 'خانه', ps: 'کور' },
  flat: { en: 'Flat', fa: 'آپارتمان', ps: 'اپارټمنټ' },
  shop: { en: 'Shop', fa: 'مغازه', ps: 'دوکان' },
  plot: { en: 'Plot', fa: 'زمین', ps: 'پلاټ' },
  addTenancy: { en: 'Add tenancy', fa: 'افزودن اجاره', ps: 'کرایه اضافه کړئ' },
  addTenancyHint: { en: 'Add tenancy (tenant must already have a tenant account)', fa: 'افزودن اجاره (مستأجر باید قبلاً حساب داشته باشد)', ps: 'کرایه اضافه کړئ (کرایه نیونکی باید له مخکې حساب ولري)' },
  tenantEmail: { en: 'Tenant email', fa: 'ایمیل مستأجر', ps: 'د کرایه نیونکي بریښنالیک' },
  dueDay: { en: 'Due day', fa: 'روز سررسید', ps: 'د ورکړې ورځ' },
  startDate: { en: 'Start date', fa: 'تاریخ شروع', ps: 'د پیل نېټه' },
  dueDate: { en: 'Due date', fa: 'تاریخ سررسید', ps: 'د ورکړې نېټه' },
  paidDate: { en: 'Paid date', fa: 'تاریخ پرداخت', ps: 'د ورکړې نېټه' },
  inviteDealer: { en: 'Invite a dealer', fa: 'دعوت مشاور', ps: 'ډیلر راوبلئ' },
  dealerEmail: { en: 'Dealer email', fa: 'ایمیل مشاور', ps: 'د ډیلر بریښنالیک' },
  propertyOptional: { en: 'Property (optional — blank means all your properties)', fa: 'ملک (اختیاری — خالی یعنی همه املاک شما)', ps: 'جایداد (اختیاري — تش یعنې ستاسو ټول جایدادونه)' },
  business: { en: 'Business', fa: 'کسب‌وکار', ps: 'سوداګري' },

  // Tenant dashboard
  tenantDashboard: { en: 'Tenant Dashboard', fa: 'داشبورد مستأجر', ps: 'د کرایه نیونکي ډشبورډ' },
  noTenancy: { en: 'No active tenancy yet.', fa: 'هنوز اجاره فعالی نیست.', ps: 'تر اوسه هېڅ فعال کرایه نشته.' },
  rentPayments: { en: 'Rent payments', fa: 'پرداخت‌های اجاره', ps: 'د کرایې ورکړې' },
  reportComplaint: { en: 'Report a complaint', fa: 'ثبت شکایت', ps: 'شکایت ثبت کړئ' },
  complaintHint: { en: 'You can submit a complaint once a landlord links you to a property (active tenancy).', fa: 'وقتی موجر شما را به ملکی وصل کند (اجاره فعال) می‌توانید شکایت ثبت کنید.', ps: 'کله چې مالک تاسو له جایداد سره وتړي (فعال کرایه)، نو شکایت ثبتولی شئ.' },
  complaintSuccess: { en: 'Complaint submitted successfully.', fa: 'شکایت با موفقیت ثبت شد.', ps: 'شکایت په بریالیتوب ثبت شو.' },
  submitComplaint: { en: 'Submit complaint', fa: 'ثبت شکایت', ps: 'شکایت ثبت کړئ' },
  description: { en: 'Description', fa: 'توضیحات', ps: 'تشریح' },
  monthlyRentIs: { en: 'Monthly rent:', fa: 'اجاره ماهانه:', ps: 'میاشتنۍ کرایه:' },
  dueDayIs: { en: 'Due day:', fa: 'روز سررسید:', ps: 'د ورکړې ورځ:' },
  statusIs: { en: 'Status:', fa: 'وضعیت:', ps: 'حالت:' },

  // Dealer dashboard
  dealerDashboard: { en: 'Dealer Dashboard', fa: 'داشبورد مشاور', ps: 'د ډیلر ډشبورډ' },
  linkedLandlords: { en: 'Linked landlords', fa: 'موجرهای مرتبط', ps: 'تړلي مالکان' },
  vacantUnits: { en: 'Vacant units', fa: 'واحدهای خالی', ps: 'خالي واحدونه' },
  openInquiries: { en: 'Open inquiries', fa: 'استعلام‌های باز', ps: 'خلاص پوښتنې' },
  pendingCommission: { en: 'Pending commission', fa: 'کمیسیون معوق', ps: 'پاتې کمېشن' },
  recentActivity: { en: 'Recent activity', fa: 'فعالیت‌های اخیر', ps: 'وروستي فعالیتونه' },
  recentInquiries: { en: 'Recent inquiries', fa: 'استعلام‌های اخیر', ps: 'وروستۍ پوښتنې' },
  recentListings: { en: 'Recent listings', fa: 'آگهی‌های اخیر', ps: 'وروستي اعلانونه' },
  viewAllInquiries: { en: 'View all inquiries →', fa: 'مشاهده همه استعلام‌ها ←', ps: 'ټولې پوښتنې وګورئ ←' },
  viewProperties: { en: 'View properties →', fa: 'مشاهده املاک ←', ps: 'جایدادونه وګورئ ←' },

  // My landlords
  inviteLandlord: { en: 'Invite a landlord', fa: 'دعوت موجر', ps: 'مالک راوبلئ' },
  inviteLandlordHint: { en: 'The landlord must already have a RentAasan landlord account. They approve the request before you get access.', fa: 'موجر باید قبلاً حساب موجر RentAasan داشته باشد. او درخواست را تأیید می‌کند تا دسترسی بگیرید.', ps: 'مالک باید له مخکې د RentAasan مالک حساب ولري. هغه به ستاسو غوښتنه ومني، بیا به لاسرسی ولرئ.' },
  landlordEmail: { en: 'Landlord email', fa: 'ایمیل موجر', ps: 'د مالک بریښنالیک' },

  // Dealer properties
  propertiesHint: { en: 'Only properties of landlords you are actively linked to.', fa: 'فقط املاک موجرهایی که فعالانه به آن‌ها مرتبط هستید.', ps: 'یوازې د هغو مالکانو جایدادونه چې ورسره فعال تړلي یاست.' },

  // Inquiries
  inquiriesHint: { en: 'Log an inquiry right after a call — only name, contact, property and notes are required.', fa: 'بلافاصله بعد از تماس استعلام ثبت کنید — فقط نام، تماس، ملک و یادداشت لازم است.', ps: 'له زنګ وروسته سمدلاسه پوښتنه ثبت کړئ — یوازې نوم، اړیکه، جایداد او یادښت اړین دي.' },
  noPropertiesHint: { en: 'No properties available yet — link a landlord first from My Landlords, then their properties will appear in the dropdown.', fa: 'هنوز ملکی نیست — اول از «موجرهای من» موجری را وصل کنید، بعد املاک او در فهرست می‌آیند.', ps: 'تر اوسه هېڅ جایداد نشته — لومړی له «زما مالکان» څخه مالک وتړئ، بیا به یې جایدادونه په لېست کې راښکاره شي.' },
  contactNumber: { en: 'Contact number', fa: 'شماره تماس', ps: 'د اړیکې شمېره' },
  statusOptional: { en: 'Status (optional)', fa: 'وضعیت (اختیاری)', ps: 'حالت (اختیاري)' },
  viewingDateOptional: { en: 'Viewing date (optional)', fa: 'تاریخ بازدید (اختیاری)', ps: 'د لیدنې نېټه (اختیاري)' },
  logInquiry: { en: 'Log inquiry', fa: 'ثبت استعلام', ps: 'پوښتنه ثبت کړئ' },
  inquirySuccess: { en: 'Inquiry logged successfully.', fa: 'استعلام با موفقیت ثبت شد.', ps: 'پوښتنه په بریالیتوب ثبت شوه.' },
  viewing: { en: 'Viewing', fa: 'بازدید', ps: 'لیدنه' },
  contact: { en: 'Contact', fa: 'تماس', ps: 'اړیکه' },

  // Commissions
  requestPaymentTitle: { en: 'Request payment for a closed deal', fa: 'درخواست پرداخت برای معامله بسته‌شده', ps: 'د تړل شوي معاملې لپاره د ورکړې غوښتنه' },
  dealClosedDate: { en: 'Deal closed date', fa: 'تاریخ بسته‌شدن معامله', ps: 'د معاملې د تړلو نېټه' },
  requestPayment: { en: 'Request payment', fa: 'درخواست پرداخت', ps: 'د ورکړې غوښتنه' },
  closedCol: { en: 'Closed', fa: 'بسته‌شده', ps: 'تړل شوې' },

  // Agreements
  agreementsTitle: { en: 'Rental Agreements', fa: 'توافق‌نامه‌های اجاره', ps: 'د کرایې هوکړه‌لیکونه' },
  agreementsHint: { en: 'Write the agreement in your own words. The PDF is laid out as an organized document under your business name (from your dealer profile, else your name).', fa: 'توافق را با کلمات خودتان بنویسید. PDF به صورت سندی منظم با نام کسب‌وکار شما (از پروفایل مشاور، وگرنه نام شما) ساخته می‌شود.', ps: 'هوکړه‌لیک په خپلو ټکو ولیکئ. PDF به ستاسو د سوداګرۍ نوم لاندې (ستاسو د ډیلر پروفایل څخه، که نه نو ستاسو نوم) په منظم ډول جوړېږي.' },
  dealerTitleOnPdf: { en: 'Dealer title on PDFs', fa: 'عنوان مشاور در PDFها', ps: 'په PDF کې د ډیلر سرلیک' },
  dealerTitleHint: { en: 'This name appears at the top of every agreement PDF as the property dealer title. If left empty, your own name is used.', fa: 'این نام بالای هر PDF توافق به عنوان عنوان مشاور املاک می‌آید. اگر خالی باشد، نام خودتان استفاده می‌شود.', ps: 'دا نوم به د هر هوکړه‌لیک PDF په سر کې د ډیلر سرلیک په توګه راځي. که تش وي، نو ستاسو خپل نوم کارېږي.' },
  businessName: { en: 'Business name', fa: 'نام کسب‌وکار', ps: 'د سوداګرۍ نوم' },
  businessNamePh: { en: 'e.g. Demo Estate Advisors', fa: 'مثلاً مشاوران املاک نمونه', ps: 'لکه: د نمونې جایداد مشاورین' },
  saveTitle: { en: 'Save title', fa: 'ذخیره عنوان', ps: 'سرلیک خوندي کړئ' },
  titleSaved: { en: 'Dealer title saved. It will appear on every agreement PDF.', fa: 'عنوان مشاور ذخیره شد. در هر PDF توافق خواهد آمد.', ps: 'د ډیلر سرلیک خوندي شو. دا به په هر هوکړه‌لیک PDF کې راځي.' },
  agreementTitle: { en: 'Agreement title', fa: 'عنوان توافق', ps: 'د هوکړه‌لیک سرلیک' },
  agreementTitlePh: { en: 'e.g. Rent Agreement - Gulberg Flat', fa: 'مثلاً توافق اجاره - آپارتمان گلبرگ', ps: 'لکه: د کرایې هوکړه‌لیک - ګلبرګ فلیټ' },
  propertyOptional: { en: 'Property (optional)', fa: 'ملک (اختیاری)', ps: 'جایداد (اختیاري)' },
  noProperty: { en: 'No specific property', fa: 'بدون ملک خاص', ps: 'ځانګړی جایداد نشته' },
  agreementContent: { en: 'Agreement content', fa: 'متن توافق', ps: 'د هوکړه‌لیک متن' },
  agreementContentPh: { en: 'Write whatever you want in the agreement, one clause per paragraph...', fa: 'هر چه می‌خواهید در توافق بنویسید، هر بند در یک پاراگراف…', ps: 'په هوکړه‌لیک کې هر څه چې غواړئ ولیکئ، هر بند په یو پراګراف کې…' },
  saveAgreement: { en: 'Save agreement', fa: 'ذخیره توافق', ps: 'هوکړه‌لیک خوندي کړئ' },
  agreementSaved: { en: 'Agreement saved. Download its PDF from the list below.', fa: 'توافق ذخیره شد. PDF آن را از فهرست زیر دانلود کنید.', ps: 'هوکړه‌لیک خوندي شو. د لاندې لېست څخه یې PDF ښکته کړئ.' },
  savedAgreements: { en: 'Saved agreements', fa: 'توافق‌های ذخیره‌شده', ps: 'خوندي شوي هوکړه‌لیکونه' },
  noAgreements: { en: 'No agreements yet.', fa: 'هنوز توافقی نیست.', ps: 'تر اوسه هېڅ هوکړه‌لیک نشته.' },
};

const LanguageContext = createContext({ lang: 'en', dir: 'ltr', setLang: () => {}, t: (k) => k });

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('rentaasan_lang') || 'en');
  const info = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = info.code;
    document.documentElement.dir = info.dir;
    localStorage.setItem('rentaasan_lang', lang);
  }, [lang, info.code, info.dir]);

  const t = (key) => {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  };

  return (
    <LanguageContext.Provider value={{ lang, dir: info.dir, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
