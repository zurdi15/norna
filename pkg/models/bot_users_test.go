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

package models

import (
	"testing"

	"code.vikunja.io/api/pkg/db"
	"code.vikunja.io/api/pkg/user"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"xorm.io/xorm"
)

func TestBotUser_Create(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		owner, err := user.GetUserByID(s, 1)
		require.NoError(t, err)

		bot := &BotUser{User: user.User{Username: "bot-model-success"}}
		require.NoError(t, bot.Create(s, owner))
		assert.True(t, bot.IsBot())
		assert.Equal(t, owner.ID, bot.BotOwnerID)
	})
	t.Run("bot cannot create bot", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		botOwner := &user.User{ID: 555, BotOwnerID: 1}
		bot := &BotUser{User: user.User{Username: "bot-child"}}
		err := bot.Create(s, botOwner)
		require.Error(t, err)
		assert.True(t, user.IsErrBotNotOwned(err))
	})
}

func TestBotUser_ReadAll(t *testing.T) {
	db.LoadAndAssertFixtures(t)
	s := db.NewSession()
	defer s.Close()

	owner, err := user.GetUserByID(s, 1)
	require.NoError(t, err)

	bot := &BotUser{User: user.User{Username: "bot-readall"}}
	require.NoError(t, bot.Create(s, owner))

	list := &BotUser{}
	result, _, _, err := list.ReadAll(s, owner, "", 1, 50)
	require.NoError(t, err)
	bots, ok := result.([]*BotUser)
	require.True(t, ok)
	found := false
	for _, u := range bots {
		if u.Username == "bot-readall" {
			found = true
		}
	}
	assert.True(t, found)
}

func TestBotUser_CanRead_NotOwned(t *testing.T) {
	db.LoadAndAssertFixtures(t)
	s := db.NewSession()
	defer s.Close()

	owner, err := user.GetUserByID(s, 1)
	require.NoError(t, err)
	other, err := user.GetUserByID(s, 2)
	require.NoError(t, err)

	bot := &BotUser{User: user.User{Username: "bot-notowned"}}
	require.NoError(t, bot.Create(s, owner))

	view := &BotUser{User: user.User{ID: bot.ID}}
	canRead, _, err := view.CanRead(s, other)
	require.NoError(t, err)
	assert.False(t, canRead)
}

func TestBotUser_Update_Status(t *testing.T) {
	db.LoadAndAssertFixtures(t)
	s := db.NewSession()
	defer s.Close()

	owner, err := user.GetUserByID(s, 1)
	require.NoError(t, err)

	bot := &BotUser{User: user.User{Username: "bot-update"}}
	require.NoError(t, bot.Create(s, owner))

	upd := &BotUser{Status: user.StatusDisabled, User: user.User{ID: bot.ID, Name: "Renamed"}}
	require.NoError(t, upd.Update(s, owner))
	assert.Equal(t, user.StatusDisabled, upd.Status)
	assert.Equal(t, "Renamed", upd.Name)
}

func TestBotUser_Delete(t *testing.T) {
	db.LoadAndAssertFixtures(t)
	s := db.NewSession()
	defer s.Close()

	owner, err := user.GetUserByID(s, 1)
	require.NoError(t, err)

	bot := &BotUser{User: user.User{Username: "bot-delete"}}
	require.NoError(t, bot.Create(s, owner))

	del := &BotUser{User: user.User{ID: bot.ID}}
	require.NoError(t, del.Delete(s, owner))
}

// An owner must keep managing a bot after disabling it. Loading it through
// user.GetUserByID refused disabled accounts (error 1020), which locked the
// owner out of the bot for good.
func TestBotUser_Disabled(t *testing.T) {
	// disabledBot creates a bot owned by user 1 and disables it.
	disabledBot := func(t *testing.T, s *xorm.Session) (*user.User, int64) {
		t.Helper()
		owner, err := user.GetUserByID(s, 1)
		require.NoError(t, err)

		bot := &BotUser{User: user.User{Username: "bot-disabled"}}
		require.NoError(t, bot.Create(s, owner))

		disable := &BotUser{
			Status: user.StatusDisabled,
			User:   user.User{ID: bot.ID},
		}
		require.NoError(t, disable.Update(s, owner))
		require.Equal(t, user.StatusDisabled, disable.Status)
		return owner, bot.ID
	}

	t.Run("owner can read it", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()
		owner, id := disabledBot(t, s)

		bot := &BotUser{User: user.User{ID: id}}
		canRead, _, err := bot.CanRead(s, owner)
		require.NoError(t, err)
		require.True(t, canRead)
		require.NoError(t, bot.ReadOne(s, owner))
		assert.Equal(t, user.StatusDisabled, bot.Status)
		assert.Equal(t, "bot-disabled", bot.Username)
	})
	t.Run("owner can enable it", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()
		owner, id := disabledBot(t, s)

		bot := &BotUser{
			Status: user.StatusActive,
			User:   user.User{ID: id},
		}
		canUpdate, err := bot.CanUpdate(s, owner)
		require.NoError(t, err)
		require.True(t, canUpdate)
		require.NoError(t, bot.Update(s, owner))
		assert.Equal(t, user.StatusActive, bot.Status)
		require.NoError(t, s.Commit())

		db.AssertExists(t, "users", map[string]any{
			"id":     id,
			"status": user.StatusActive,
		}, false)
	})
	t.Run("owner can rename it", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()
		owner, id := disabledBot(t, s)

		bot := &BotUser{
			Status: user.StatusDisabled,
			User: user.User{
				ID:       id,
				Name:     "Renamed",
				Username: "bot-disabled-renamed",
			},
		}
		canUpdate, err := bot.CanUpdate(s, owner)
		require.NoError(t, err)
		require.True(t, canUpdate)
		require.NoError(t, bot.Update(s, owner))
		require.NoError(t, s.Commit())

		db.AssertExists(t, "users", map[string]any{
			"id":       id,
			"name":     "Renamed",
			"username": "bot-disabled-renamed",
			"status":   user.StatusDisabled,
		}, false)
	})
	t.Run("owner can delete it", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()
		owner, id := disabledBot(t, s)

		bot := &BotUser{User: user.User{ID: id}}
		canDelete, err := bot.CanDelete(s, owner)
		require.NoError(t, err)
		require.True(t, canDelete)
		require.NoError(t, bot.Delete(s, owner))
		require.NoError(t, s.Commit())

		db.AssertMissing(t, "users", map[string]any{
			"id": id,
		})
	})
	t.Run("another user cannot read, change or delete it", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()
		_, id := disabledBot(t, s)
		other, err := user.GetUserByID(s, 2)
		require.NoError(t, err)

		bot := &BotUser{
			Status: user.StatusActive,
			User:   user.User{ID: id},
		}
		canRead, _, err := bot.CanRead(s, other)
		require.NoError(t, err)
		assert.False(t, canRead)
		canUpdate, err := bot.CanUpdate(s, other)
		require.NoError(t, err)
		assert.False(t, canUpdate)
		canDelete, err := bot.CanDelete(s, other)
		require.NoError(t, err)
		assert.False(t, canDelete)
	})
}
