from pydantic import BaseModel


class ActivePost(BaseModel):
    id: str
    title: str
    description: str
    category: str
    user_name: str


class SuggestRequest(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    dietary_preferences: str | None = None
    allergies: str | None = None
    active_posts: list[ActivePost] = []
    ai_suggest_flag_value: bool = True  # Client-evaluated flag value for LD correlation


class MatchedPost(BaseModel):
    post_id: str
    title: str
    reason: str


class SuggestResponse(BaseModel):
    suggested_description: str
    matched_posts: list[MatchedPost]
