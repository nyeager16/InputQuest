from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)
    access_key = forms.CharField(max_length=50, required=False, help_text="Optional")

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2', 'access_key')