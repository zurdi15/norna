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
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestForkEnablesEveryFeature(t *testing.T) {
	previous := gated.Load()
	gated.Store(false)
	defer gated.Store(previous)

	for feature := range featureToString {
		assert.True(t, IsFeatureEnabled(feature), feature.String())
	}
	assert.False(t, IsFeatureEnabled(FeatureUnknown))
	assert.Len(t, EnabledProFeatures(), len(featureToString))
}
