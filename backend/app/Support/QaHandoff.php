<?php

namespace App\Support;

use App\Models\Project;
use App\Models\QaReview;
use App\Models\SprintItem;
use App\Models\User;

/** Automatic hand-off: a finished sprint task opens a QA review (round 1, 2, 3 ...) and tells the QA team. */
class QaHandoff
{
    public static function open(SprintItem $item, User $actor): QaReview
    {
        $sprint = $item->sprint;
        $project = Project::find($sprint->project_id);
        $round = QaReview::where('sprint_item_id', $item->id)->count() + 1;

        $review = QaReview::create(['project_id' => $project->id, 'sprint_id' => $sprint->id, 'sprint_item_id' => $item->id, 'round' => $round]);

        Notify::users(Access::teamMembers(['qa']), 'Ready for QA', "\"{$project->name}\": \"{$item->title}\" is finished and waiting for testing (round {$round}).", 'qa_ready', $project->id, $actor);
        if ($round >= 4) {
            Notify::users(Access::pmoManagers(), 'Task keeps failing QA', "\"{$project->name}\": \"{$item->title}\" is on its {$round}th QA round.", 'qa_repeated', $project->id, $actor);
        }

        return $review;
    }
}
