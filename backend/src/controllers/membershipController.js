const Membership = require("../models/membershipModel");
const Group = require("../models/GroupModel");
const User = require("../models/userModel");

// Utility function to check if a group exists
const checkGroupExists = async (groupId) => {
  return await Group.findById(groupId);
};

/**
 * @desc Add a member to a group by email
 * @route POST /groups/:groupId/members
 * @param {string} groupId - The ID of the group
 * @param {string} email - The email of the user to be added
 * @returns {Object} - The membership object or error message
 */
exports.addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    const group = await checkGroupExists(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const results = await Promise.all(
      email.map(async (email) => {
        const user = await User.findOne({ email });
        if (user === null) {
          const existingMembership = await Membership.findOne({
            invitedMail: email,
            groupId,
          });

          if (existingMembership) {
            return { email, message: "User is already a member or invited" };
          }

          const membership = new Membership({
            invitedMail: email,
            groupId,
            isAccepted: false,
          });
          await membership.save();
          return { email, membership };
        }

        const existingMembership = await Membership.findOne({
          userId: user._id,
          groupId,
        });
        if (existingMembership) {
          return { email: user.email, message: `${user.email}  deja invité. Veuillez supprimer la ligne.` };
        }

        const membership = new Membership({
          userId: user._id,
          groupId,
          isAccepted: false,
        });

        await membership.save();
        return { email: user.email, membership };
      })
    );

    const errors = results.filter((result) => result.message);
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Some user are already members",
        errors,
      });
    }

    return res.status(201).json({
      message: "Members added successfully",
      memberships: results.filter((result) => result.membership),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error adding members", error });
  }
};

/**
 * @desc Get all members of a group
 * @route GET /groups/:groupId/members
 * @param {string} groupId - The ID of the group
 * @returns {Array} - List of group members or error message
 */
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await checkGroupExists(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = await Membership.find({ groupId }).populate("userId", "username email");
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: "Error getting group members", error });
  }
};

/**
 * @desc Update the acceptance status of a member in a group
 * @route PUT /groups/:groupId/members/:userId
 * @param {string} groupId - The ID of the group
 * @param {string} userId - The ID of the user
 * @param {boolean} isAccepted - Acceptance status
 * @returns {Object} - Updated membership object or error message
 */
exports.updateMemberStatus = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { isAccepted } = req.body;

    const group = await checkGroupExists(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const membership = await Membership.findOne({ userId, groupId });
    if (!membership) {
      return res.status(404).json({ message: "Member not found in this group" });
    }

    membership.isAccepted = isAccepted;
    membership.updatedAt = Date.now();

    const updatedMember = await new Membership({ membership }).save();
    res.status(200).json(updatedMember);
  } catch (error) {
    res.status(500).json({ message: "Error updating member status", error });
  }
};

/**
 * @desc Remove a member from a group
 * @route DELETE /groups/:groupId/members/:userId
 * @param {string} groupId - The ID of the group
 * @param {string} userId - The ID of the user
 * @returns {Object} - Success message or error message
 */
exports.removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await checkGroupExists(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    const invitedEmail = await Membership.findOneAndDelete({ invitedMail: userId });

    if (invitedEmail) {
      return res.status(200).json({ message: "invite successfully removed" });
    }

    const membership = await Membership.findOneAndDelete({ userId, groupId });
    if (!membership) {
      return res.status(200).json({ message: "Member successfully removed" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting member from group", error });
  }
};

/**
 * @desc Verify if the user is a member or the owner of a group
 * @route GET /groups/:groupId/members
 * @param {string} groupId - The ID of the group
 * @returns {Object} - Object indicating if the user is a member or the owner, or an error message
 */
exports.verifyIsMemberOrOwner = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await checkGroupExists(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.ownerId.toString() === userId) {
      return res.status(200).json({ isMember: true, isOwner: true });
    }

    const membership = await Membership.findOne({ groupId, userId });
    if (membership) {
      return res.status(200).json({ isMember: true, isOwner: false });
    }

    return res.status(403).json({ message: "Access denied: User is neither a member nor the owner." });
  } catch (error) {
    res.status(500).json({ message: "Error checking user membership or ownership", error });
  }
};
