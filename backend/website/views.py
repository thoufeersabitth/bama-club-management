import os
import json
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from .models import HeroBanner, Announcement, FAQ, Testimonial, GlobalCmsConfig
from .serializers import HeroBannerSerializer, AnnouncementSerializer, FAQSerializer, TestimonialSerializer

CMS_JSON_FILE = os.path.join(settings.BASE_DIR, 'cms_config.json')

class CmsConfigAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            config_obj = GlobalCmsConfig.objects.order_by('-updated_at').first()
            if config_obj and config_obj.data and len(config_obj.data.keys()) > 0:
                return Response(config_obj.data, status=status.HTTP_200_OK)
        except Exception:
            pass

        if os.path.exists(CMS_JSON_FILE):
            try:
                with open(CMS_JSON_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return Response(data, status=status.HTTP_200_OK)
            except Exception:
                pass
        return Response({}, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        try:
            config_obj = GlobalCmsConfig.objects.order_by('-updated_at').first()
            if not config_obj:
                config_obj = GlobalCmsConfig.objects.create(data=data)
            else:
                config_obj.data = data
                config_obj.save()

            try:
                with open(CMS_JSON_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except Exception:
                pass

            return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HeroBannerViewSet(viewsets.ModelViewSet):
    queryset = HeroBanner.objects.all().order_by('order')
    serializer_class = HeroBannerSerializer
    permission_classes = [permissions.AllowAny]

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-date')
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.AllowAny]

class FAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all().order_by('order')
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    permission_classes = [permissions.AllowAny]
