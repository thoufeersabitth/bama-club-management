from django.contrib import admin
from .models import HeroBanner, Announcement, FAQ, Testimonial

@admin.register(HeroBanner)
class HeroBannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'button_text', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('title', 'subtitle')

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'date', 'is_important')
    list_filter = ('category', 'is_important', 'date')
    search_fields = ('title', 'content')

@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'order')
    list_filter = ('category',)
    search_fields = ('question', 'answer')

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'rating')
    list_filter = ('rating', 'role')
    search_fields = ('name', 'comment')

