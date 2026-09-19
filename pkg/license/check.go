// Vikunja is a to-do list application to facilitate your life.
// Copyright 2018-present Vikunja and contributors. All rights reserved.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

package license

import (
	"encoding/json"
	"fmt"
	"time"
)

// Response is what the upstream license server answered. Norna never asks it; the type stays for
// the cached license_status row that the e2e harness and the upstream tests seed.
type Response struct {
	Valid     bool      `json:"valid"`
	Message   string    `json:"message,omitempty"`
	Features  []Feature `json:"features"`
	MaxUsers  int64     `json:"max_users"`
	ExpiresAt time.Time `json:"expires_at"`
}

func parseResponse(raw string) (*Response, error) {
	var resp Response
	if err := json.Unmarshal([]byte(raw), &resp); err != nil {
		return nil, fmt.Errorf("parsing cached license response: %w", err)
	}
	return &resp, nil
}
