from fastapi import APIRouter
from app.routes import auth, users, cows, milk, members, distribution, dashboard, settings, cow_types, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cows.router, prefix="/cows", tags=["cows"])
api_router.include_router(cow_types.router, prefix="/cow-type-options", tags=["cow_type_options"])
api_router.include_router(milk.router, prefix="/milk", tags=["milk"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(distribution.router, prefix="/distribution", tags=["distribution"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
