package models

type User struct {
	ID         int64  `json:"id,omitempty"`
	UserID     string `json:"user_id"`
	Name       string `json:"name"`
	Password   string `json:"password,omitempty"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
	Picture    string `json:"picture"`
	Email      string `json:"email"`
}

type GoogleUser struct {
	ID         string `json:"id,omitempty"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
	Picture    string `json:"picture"`
}
