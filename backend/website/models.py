import uuid
from django.db import models

class HeroBanner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    button_text = models.CharField(max_length=50, default='Explore Programs')
    button_link = models.CharField(max_length=255, default='/programs')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=1)

    def __str__(self):
        return self.title

class Announcement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=50, default='General')
    date = models.DateField(auto_now_add=True)
    is_important = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class FAQ(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=50, default='General')
    order = models.IntegerField(default=1)

    def __str__(self):
        return self.question

class Testimonial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100, default='Parent')
    comment = models.TextField()
    rating = models.IntegerField(default=5)
    photo_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.role}"
