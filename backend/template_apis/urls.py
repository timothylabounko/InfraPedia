from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health, name='template-api-health'),
    path('osm/geocode/', views.osm_geocode, name='osm-geocode'),
    path('overpass/', views.overpass_proxy, name='overpass-proxy'),
    path('overpass-alt/', views.overpass_proxy, name='overpass-proxy-alt'),
    path('overpass-fr/', views.overpass_proxy, name='overpass-proxy-fr'),
    path('nominatim/', views.nominatim_compat, name='nominatim-compat'),
    path('tract/<str:geoid>/demographics/', views.tract_demographics, name='tract-demographics'),
    path('analyze/corridor/', views.analyze_corridor, name='analyze-corridor'),
    path('analyze/station/', views.analyze_station, name='analyze-station'),
    path('analyze/', views.analyze_corridor, name='analyze-legacy'),
    path('bikeability/city/', views.bikeability_city, name='bikeability-city'),
]
