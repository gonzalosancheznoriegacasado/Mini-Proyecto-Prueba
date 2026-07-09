import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.api.deps import get_db, get_current_user
from backend.db.database import Base
from backend.models.person import Person
from backend.models.group import Group
import uuid

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db, mock_users):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    def override_get_current_user():
        return mock_users[0]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_group(db, mock_users):
    from backend.models.group import GroupMember, RoleEnum
    group = Group(id=uuid.uuid4(), name="Test Group", created_by=mock_users[0].id)
    db.add(group)
    
    # Add creator as member
    member = GroupMember(
        group_id=group.id,
        person_id=mock_users[0].id,
        role=RoleEnum.ADMIN
    )
    db.add(member)
    
    db.commit()
    return group

@pytest.fixture
def mock_users(db):
    user1 = Person(id=uuid.uuid4(), name="User 1", email="u1@test.com", password_hash="hash")
    user2 = Person(id=uuid.uuid4(), name="User 2", email="u2@test.com", password_hash="hash")
    user3 = Person(id=uuid.uuid4(), name="User 3", email="u3@test.com", password_hash="hash")
    db.add_all([user1, user2, user3])
    db.commit()
    return [user1, user2, user3]
