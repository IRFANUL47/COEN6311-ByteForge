from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="profile",
            old_name="dieterary_restrictions",
            new_name="dietary_restrictions",
        ),
    ]