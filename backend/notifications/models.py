import uuid
from django.db import models

class WhatsAppLog(models.Model):
    STATUS_CHOICES = [
        ('Sent', 'Sent'),
        ('Pending', 'Pending'),
        ('Failed', 'Failed')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    template_name = models.CharField(max_length=100)
    message_text = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Sent')
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.template_name} to {self.phone} ({self.status})"
