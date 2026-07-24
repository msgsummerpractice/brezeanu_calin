import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth.models import User
from accounts.models import UserProfile

# Create admin user
if not User.objects.filter(username='admin@skyrefund.com').exists():
    admin = User.objects.create_superuser(username='admin@skyrefund.com', email='admin@skyrefund.com', password='Admin123!', first_name='Admin', last_name='User')
    UserProfile.objects.create(user=admin, must_change_password=False)
    print('Admin created: admin@skyrefund.com / Admin123!')
else:
    print('Admin already exists: admin@skyrefund.com / Admin123!')

# Create regular user
if not User.objects.filter(username='user@skyrefund.com').exists():
    regular = User.objects.create_user(username='user@skyrefund.com', email='user@skyrefund.com', password='User1234!', first_name='John', last_name='Doe')
    UserProfile.objects.create(user=regular, must_change_password=False)
    print('User created: user@skyrefund.com / User1234!')
else:
    print('User already exists: user@skyrefund.com / User1234!')
