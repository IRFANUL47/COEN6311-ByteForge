from ..models import Equipment
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import  IsAuthenticated
from rest_framework.response import Response


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
    quantity = request.data.get('quantity', 0)

    if not name or not category:
        return Response({'detail': 'Name and category are required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid_categories = [c[0] for c in Equipment.Category.choices]
    if category not in valid_categories:
        return Response({'detail': f'Invalid category. Must be one of: {valid_categories}'}, status=status.HTTP_400_BAD_REQUEST)

    if quantity < 0:
        return Response({'detail': 'Quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

    equipment = Equipment.objects.create(name=name, category=category, quantity=quantity)
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

    new_name = request.data.get('name', equipment.name)
    if not str(new_name).strip():
        return Response({'detail': 'Equipment name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    new_quantity = request.data.get('quantity', equipment.quantity)
    if new_quantity < 0:
        return Response({'detail': 'Quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
    
    equipment.name = new_name
    equipment.category = new_category
    equipment.quantity = new_quantity
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
    return Response({'detail': 'Equipment deleted.'}, status=status.HTTP_200_OK)