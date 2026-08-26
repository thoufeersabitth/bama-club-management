from django.contrib import admin
from .models import WhatsAppLog

@admin.register(WhatsAppLog)
class WhatsAppLogAdmin(admin.ModelAdmin):
    list_display = ('recipient_name', 'phone', 'template_name', 'status', 'sent_at')
    list_filter = ('status', 'template_name', 'sent_at')
    search_fields = ('recipient_name', 'phone', 'message_text')
    ordering = ('-sent_at',)
