from ..models import Equipment
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import  IsAuthenticated
from rest_framework.response import Response

def get_availability(quantity, max_quantity):
    if quantity == 0:
        return 'UNAVAILABLE'
    elif quantity / max_quantity <= 0.3:
        return 'LOW'
    else:
        return 'AVAILABLE'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def equipment_list(request):
    equipment = Equipment.objects.all().order_by('category', 'name')
    data = [
        {
            'id': e.id,
            'name': e.name,
            'category': e.category,
            'quantity': e.quantity,
            'max_quantity': e.max_quantity,
            'availability': get_availability(e.quantity, e.max_quantity),
        }
        for e in equipment
    ]
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def equipment_create(request):
    if request.user.role != 'ADMIN':
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    
    name = request.data.get('name')
    category = request.data.get('category')
    max_quantity = request.data.get('max_quantity', 0)
    quantity = request.data.get('quantity', 0)

    if not name or not category:
        return Response({'detail': 'Name and category are required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_categories = [c[0] for c in Equipment.Category.choices]
    if category not in valid_categories:
        return Response({'detail': f'Invalid category. Must be one of: {valid_categories}'}, status=status.HTTP_400_BAD_REQUEST)

    if quantity < 0 or max_quantity < 0:
        return Response({'detail': 'Quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
    if quantity > max_quantity:
        return Response({'detail': 'Quantity cannot exceed max quantity.'}, status=status.HTTP_400_BAD_REQUEST)

    equipment = Equipment.objects.create(name=name, category=category, quantity=quantity, max_quantity=max_quantity)
    return Response({'id': equipment.id, 'name': equipment.name}, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def equipment_update(request, pk):
    if request.user.role != 'ADMIN':
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        equipment = Equipment.objects.get(pk=pk)
    except Equipment.DoesNotExist:
        return Response({'detail': 'Equipment not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_category = request.data.get('category', equipment.category)
    valid_categories = [c[0] for c in Equipment.Category.choices]
    if new_category not in valid_categories:
        return Response({'detail': f'Invalid category. Must be one of: {valid_categories}'}, status=status.HTTP_400_BAD_REQUEST)

    new_quantity = request.data.get('quantity', equipment.quantity)
    new_max_quantity = request.data.get('max_quantity', equipment.max_quantity)

    if new_quantity < 0 or new_max_quantity < 0:
        return Response({'detail': 'Quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_quantity > new_max_quantity:
        return Response({'detail': 'Quantity cannot exceed max quantity.'}, status=status.HTTP_400_BAD_REQUEST)

    equipment.name = request.data.get('name', equipment.name)
    equipment.category = new_category
    equipment.quantity = new_quantity
    equipment.max_quantity = new_max_quantity
    equipment.save()

    return Response({'detail': 'Equipment updated.'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def equipment_delete(request, pk):
    if request.user.role != 'ADMIN':
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        equipment = Equipment.objects.get(pk=pk)
    except Equipment.DoesNotExist:
        return Response({'detail': 'Equipment not found.'}, status=status.HTTP_404_NOT_FOUND)

    equipment.delete()
    return Response({'detail': 'Equipment deleted.'}, status=status.HTTP_204_NO_CONTENT)