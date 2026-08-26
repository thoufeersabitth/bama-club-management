from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import CustomTokenObtainPairView, UserViewSet
from branches.views import BranchViewSet
from students.views import StudentViewSet
from attendance.views import AttendanceViewSet
from fees.views import FeeRecordViewSet, FeeRateHistoryViewSet, FeeSettingsAPIView, ApplicableRateAPIView, GenerateInvoiceAPIView
from belt_grading.views import BeltGradingViewSet, GradingRegistrationViewSet, ExamScheduleViewSet
from website.views import HeroBannerViewSet, AnnouncementViewSet, FAQViewSet, TestimonialViewSet, CmsConfigAPIView
from notifications.views import WhatsAppLogViewSet, send_direct_whatsapp_api
from dashboard.views import SummaryStatsView

admin.site.site_header = "B.A.M.A. Official Admin Control Portal"
admin.site.site_title = "B.A.M.A. Admin"
admin.site.index_title = "Brave Academy of Martial Arts - Database Administration"

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'fees', FeeRecordViewSet, basename='fee')
router.register(r'fee-rates', FeeRateHistoryViewSet, basename='fee-rate')
router.register(r'belt-gradings', BeltGradingViewSet, basename='belt-grading')
router.register(r'exam-schedules', ExamScheduleViewSet, basename='exam-schedule')
router.register(r'grading-registrations', GradingRegistrationViewSet, basename='grading-registration')
router.register(r'hero-banners', HeroBannerViewSet, basename='hero-banner')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'faqs', FAQViewSet, basename='faq')
router.register(r'testimonials', TestimonialViewSet, basename='testimonial')
router.register(r'whatsapp-logs', WhatsAppLogViewSet, basename='whatsapp-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/dashboard/stats/', SummaryStatsView.as_view(), name='dashboard_stats'),
    path('api/send-whatsapp-api/', send_direct_whatsapp_api, name='send_direct_whatsapp_api'),
    path('api/cms-config/', CmsConfigAPIView.as_view(), name='cms_config_api'),
    path('api/fees/settings/', FeeSettingsAPIView.as_view(), name='fee_settings'),
    path('api/fees/applicable-rate/', ApplicableRateAPIView.as_view(), name='fee_applicable_rate'),
    path('api/fees/generate-invoice/', GenerateInvoiceAPIView.as_view(), name='fee_generate_invoice'),
    path('api/', include(router.urls)),
]
